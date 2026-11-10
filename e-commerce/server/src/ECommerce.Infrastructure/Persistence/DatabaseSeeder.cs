using ECommerce.Application.Common.Interfaces;
using ECommerce.Application.Common.Options;
using ECommerce.Domain.Entities;
using ECommerce.Shared.Common;
using ECommerce.Shared.Constants;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ECommerce.Infrastructure.Persistence;

public class DatabaseSeeder
{
    private readonly IMongoDatabase _database;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<DatabaseSeeder> _logger;
    private readonly SeedOptions _options;

    private static readonly string[] ImageParams = { "?auto=format&fit=crop&w=900&q=80" };

    public DatabaseSeeder(IMongoDatabase database, IPasswordHasher passwordHasher,
        IOptions<SeedOptions> options, ILogger<DatabaseSeeder> logger)
    {
        _database = database;
        _passwordHasher = passwordHasher;
        _logger = logger;
        _options = options.Value;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var users = _database.GetCollection<User>("Users");
        if (await users.CountDocumentsAsync(Builders<User>.Filter.Empty, cancellationToken: ct) > 0)
        {
            _logger.LogInformation("Database already contains data, skipping base seed");
        }
        else
        {
            _logger.LogInformation("Seeding database...");

            var roles = await SeedRolesAsync(ct);
            var permissions = await SeedPermissionsAsync(ct);
            var usersByName = await SeedUsersAsync(roles, ct);
            var settings = await SeedSettingsAsync(ct);
            var shippingMethods = await SeedShippingMethodsAsync(ct);
            var categories = await SeedCategoriesAsync(ct);
            var brands = await SeedBrandsAsync(ct);
            var products = await SeedProductsAsync(categories, brands, ct);
            await SeedBannersAsync(ct);
            await SeedTestimonialsAsync(ct);
            await SeedCouponsAsync(usersByName, ct);
            await SeedReviewsAsync(products, usersByName, ct);
            await SeedOrdersAsync(products, usersByName, shippingMethods, settings, ct);

            _logger.LogInformation(
                "Seed complete: {Users} users, {Categories} categories, {Products} products",
                usersByName.Count, categories.Count, products.Count);
        }

        await EnsureBusinessPermissionsAsync(ct);
        await EnsurePaymentSettingsAsync(ct);
        await EnsureVoucherWalletAsync(ct);
        await EnsureProductCostsAsync(ct);
        await SeedBusinessDataAsync(ct);
    }

    private async Task EnsurePaymentSettingsAsync(CancellationToken ct)
    {
        var settings = _database.GetCollection<WebsiteSettings>("WebsiteSettings");
        var current = await settings.Find(Builders<WebsiteSettings>.Filter.Empty).FirstOrDefaultAsync(ct);
        if (current is null) return;

        var updates = new List<UpdateDefinition<WebsiteSettings>>();
        if (!current.BkashEnabled && string.IsNullOrWhiteSpace(current.BkashMerchantNumber))
            updates.Add(Builders<WebsiteSettings>.Update
                .Set(s => s.BkashEnabled, true)
                .Set(s => s.BkashMerchantNumber, "01700000000"));
        if (!current.NagadEnabled && string.IsNullOrWhiteSpace(current.NagadMerchantNumber))
            updates.Add(Builders<WebsiteSettings>.Update
                .Set(s => s.NagadEnabled, true)
                .Set(s => s.NagadMerchantNumber, "01700000000"));
        if (!current.RocketEnabled && string.IsNullOrWhiteSpace(current.RocketMerchantNumber))
            updates.Add(Builders<WebsiteSettings>.Update
                .Set(s => s.RocketEnabled, true)
                .Set(s => s.RocketMerchantNumber, "01700000000"));
        if (updates.Count == 0) return;

        updates.Add(Builders<WebsiteSettings>.Update
            .Set(s => s.VoucherPointsEnabled, true)
            .Set(s => s.VoucherPointValue, current.VoucherPointValue > 0 ? current.VoucherPointValue : 1)
            .Set(s => s.VoucherEarnPercent, current.VoucherEarnPercent > 0 ? current.VoucherEarnPercent : 5)
            .Set(s => s.VoucherMaxRedeemPercent, current.VoucherMaxRedeemPercent > 0 ? current.VoucherMaxRedeemPercent : 100));

        await settings.UpdateOneAsync(
            Builders<WebsiteSettings>.Filter.Eq(s => s.Id, current.Id),
            Builders<WebsiteSettings>.Update.Combine(updates), cancellationToken: ct);
    }

    private async Task EnsureVoucherWalletAsync(CancellationToken ct)
    {
        var wallets = _database.GetCollection<VoucherWallet>("VoucherWallets");
        if (await wallets.CountDocumentsAsync(Builders<VoucherWallet>.Filter.Empty, cancellationToken: ct) > 0)
            return;

        var customer = await _database.GetCollection<User>("Users")
            .Find(Builders<User>.Filter.Eq(u => u.Role, AppRoles.Customer))
            .FirstOrDefaultAsync(ct);
        if (customer is null) return;

        var now = DateTime.UtcNow;
        var userId = customer.Id.ToString();
        await wallets.InsertOneAsync(new VoucherWallet
        {
            UserId = userId,
            UserEmail = customer.Email,
            Balance = 250,
            LifetimeEarned = 250,
            LifetimeRedeemed = 0,
            CreatedAt = now.AddDays(-30),
            UpdatedAt = now
        }, cancellationToken: ct);

        await _database.GetCollection<VoucherTransaction>("VoucherTransactions").InsertManyAsync(new[]
        {
            new VoucherTransaction
            {
                UserId = userId, UserEmail = customer.Email, Points = 150, BalanceAfter = 150,
                Type = VoucherTransactionTypes.Earned, Note = "Loyalty reward", CreatedAt = now.AddDays(-21)
            },
            new VoucherTransaction
            {
                UserId = userId, UserEmail = customer.Email, Points = 100, BalanceAfter = 250,
                Type = VoucherTransactionTypes.Earned, Note = "Welcome voucher bonus", CreatedAt = now.AddDays(-7)
            }
        }, cancellationToken: ct);
    }

    private async Task EnsureBusinessPermissionsAsync(CancellationToken ct)
    {
        var permissions = _database.GetCollection<Permission>("Permissions");
        foreach (var key in new[] { Permissions.BusinessView, Permissions.BusinessManage })
        {
            var exists = await permissions.CountDocumentsAsync(p => p.Key == key, cancellationToken: ct) > 0;
            if (exists) continue;
            await permissions.InsertOneAsync(new Permission
            {
                Key = key,
                Name = key.Split('.')[1],
                Group = key.Split('.')[0],
                Description = $"Allows {key.Split('.')[1]} access for {key.Split('.')[0]}"
            }, cancellationToken: ct);
        }

        var roles = _database.GetCollection<Role>("Roles");
        var users = _database.GetCollection<User>("Users");
        var businessPermissions = new[] { Permissions.BusinessView, Permissions.BusinessManage };
        foreach (var roleName in new[] { AppRoles.SuperAdmin, AppRoles.Admin, AppRoles.Manager, AppRoles.Staff })
        {
            var role = await roles.Find(r => r.Name == roleName).FirstOrDefaultAsync(ct);
            if (role is not null)
            {
                await roles.UpdateOneAsync(
                    Builders<Role>.Filter.Eq(r => r.Id, role.Id),
                    Builders<Role>.Update.AddToSetEach(r => r.Permissions, businessPermissions),
                    cancellationToken: ct);
            }
            await users.UpdateManyAsync(
                Builders<User>.Filter.Eq(u => u.Role, roleName),
                Builders<User>.Update.AddToSetEach(u => u.Permissions, businessPermissions),
                cancellationToken: ct);
        }
    }

    private async Task EnsureProductCostsAsync(CancellationToken ct)
    {
        var products = _database.GetCollection<Product>("Products");
        var pending = await products.Find(Builders<Product>.Filter.And(
                Builders<Product>.Filter.Eq(p => p.IsDeleted, false),
                Builders<Product>.Filter.Or(
                    Builders<Product>.Filter.Exists(p => p.CostPrice, false),
                    Builders<Product>.Filter.Lte(p => p.CostPrice, 0))))
            .ToListAsync(ct);

        foreach (var product in pending)
        {
            await products.UpdateOneAsync(
                Builders<Product>.Filter.Eq(p => p.Id, product.Id),
                Builders<Product>.Update.Set(p => p.CostPrice, Math.Round(product.Price * 0.55m, 2)),
                cancellationToken: ct);
        }
    }

    private async Task SeedBusinessDataAsync(CancellationToken ct)
    {
        var ownerCollection = _database.GetCollection<OwnerProfile>("OwnerProfiles");
        if (await ownerCollection.CountDocumentsAsync(Builders<OwnerProfile>.Filter.Empty, cancellationToken: ct) > 0)
            return;

        _logger.LogInformation("Seeding business module data...");

        await ownerCollection.InsertOneAsync(new OwnerProfile
        {
            FullName = "Safwan Ahmed",
            BusinessName = "Safwan",
            Designation = "Founder & Owner",
            Email = "owner@safwan.store",
            Phone = "01711223344",
            Address = "House 12, Road 5, Mirpur, Dhaka 1216, Bangladesh",
            DateOfBirth = new DateTime(1990, 5, 14, 0, 0, 0, DateTimeKind.Utc),
            NationalId = "1990 5514 882 001",
            TinNumber = "441-228-9012",
            BinNumber = "0044-2289-0135",
            Bio = "Retail entrepreneur from Mirpur, Dhaka. Founded Safwan in 2021 to bring thoughtfully curated everyday essentials to customers across Bangladesh.",
            EmploymentHistory = new List<EmploymentHistory>
            {
                new()
                {
                    Company = "Aarong",
                    Role = "Retail Operations Manager",
                    Location = "Dhaka, Bangladesh",
                    StartDate = new DateTime(2016, 1, 10, 0, 0, 0, DateTimeKind.Utc),
                    EndDate = new DateTime(2021, 6, 30, 0, 0, 0, DateTimeKind.Utc),
                    Description = "Managed flagship store operations, merchandising and a team of 25 retail staff."
                },
                new()
                {
                    Company = "Safwan",
                    Role = "Founder & Owner",
                    Location = "Mirpur, Dhaka",
                    StartDate = new DateTime(2021, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                    Description = "Leads buying, finance and day-to-day operations for the Safwan store."
                }
            }
        }, cancellationToken: ct);

        var staff = new List<StaffMember>
        {
            new()
            {
                EmployeeCode = "EMP-0001",
                FullName = "Ayesha Rahman",
                Email = "ayesha.rahman@safwan.store",
                Phone = "01712001001",
                Designation = "Store Manager",
                Department = "Operations",
                EmploymentType = "FullTime",
                Status = "Active",
                JoinedOn = new DateTime(2022, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                Salary = 45000,
                Address = "Block C, Mirpur 10, Dhaka",
                EmergencyContactName = "Mahmud Rahman",
                EmergencyContactPhone = "01712001999",
                Notes = "Responsible for store operations, rota planning and daily reconciliation."
            },
            new()
            {
                EmployeeCode = "EMP-0002",
                FullName = "Tanvir Hossain",
                Email = "tanvir.hossain@safwan.store",
                Phone = "01712001002",
                Designation = "Inventory Officer",
                Department = "Operations",
                EmploymentType = "FullTime",
                Status = "Active",
                JoinedOn = new DateTime(2023, 6, 12, 0, 0, 0, DateTimeKind.Utc),
                Salary = 32000,
                Address = "Mirpur 1, Dhaka",
                Notes = "Owns stock counts, supplier receiving and stock arrival records."
            },
            new()
            {
                EmployeeCode = "EMP-0003",
                FullName = "Nusrat Jahan",
                Email = "nusrat.jahan@safwan.store",
                Phone = "01712001003",
                Designation = "Customer Support Lead",
                Department = "Customer Care",
                EmploymentType = "FullTime",
                Status = "Active",
                JoinedOn = new DateTime(2024, 1, 8, 0, 0, 0, DateTimeKind.Utc),
                Salary = 30000,
                Address = "Kazipara, Mirpur, Dhaka",
                Notes = "Handles order support, returns and the customer inbox."
            },
            new()
            {
                EmployeeCode = "EMP-0004",
                FullName = "Farhan Ahmed",
                Email = "farhan.ahmed@safwan.store",
                Phone = "01712001004",
                Designation = "Digital Marketing Executive",
                Department = "Marketing",
                EmploymentType = "Contract",
                Status = "Active",
                JoinedOn = new DateTime(2024, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                Salary = 28000,
                Address = "Shewrapara, Mirpur, Dhaka",
                Notes = "Runs paid campaigns and manages the social media calendar."
            },
            new()
            {
                EmployeeCode = "EMP-0005",
                FullName = "Sadia Islam",
                Email = "sadia.islam@safwan.store",
                Phone = "01712001005",
                Designation = "Senior Sales Associate",
                Department = "Sales",
                EmploymentType = "PartTime",
                Status = "Active",
                JoinedOn = new DateTime(2024, 11, 5, 0, 0, 0, DateTimeKind.Utc),
                Salary = 18000,
                Address = "Pallabi, Mirpur, Dhaka"
            },
            new()
            {
                EmployeeCode = "EMP-0006",
                FullName = "Rafiq Uddin",
                Email = "rafiq.uddin@safwan.store",
                Phone = "01712001006",
                Designation = "Accounts Officer",
                Department = "Finance",
                EmploymentType = "FullTime",
                Status = "Resigned",
                JoinedOn = new DateTime(2022, 9, 1, 0, 0, 0, DateTimeKind.Utc),
                LeftOn = new DateTime(2025, 3, 31, 0, 0, 0, DateTimeKind.Utc),
                Salary = 35000,
                Notes = "Resigned to relocate outside Dhaka. Handover completed with the owner."
            }
        };
        await _database.GetCollection<StaffMember>("StaffMembers").InsertManyAsync(staff, cancellationToken: ct);

        await _database.GetCollection<CapitalEntry>("CapitalEntries").InsertManyAsync(new[]
        {
            new CapitalEntry { Type = "Investment", Amount = 500000, Source = "Owner", PaymentMethod = "Bank Transfer", Reference = "IBBL-2025-0102", Note = "Initial working capital", EntryDate = new DateTime(2025, 1, 5, 0, 0, 0, DateTimeKind.Utc) },
            new CapitalEntry { Type = "Investment", Amount = 250000, Source = "Owner", PaymentMethod = "Bank Transfer", Reference = "IBBL-2025-0410", Note = "Seasonal stock purchase", EntryDate = new DateTime(2025, 4, 10, 0, 0, 0, DateTimeKind.Utc) },
            new CapitalEntry { Type = "Investment", Amount = 150000, Source = "Owner", PaymentMethod = "Bank Transfer", Note = "Showroom renovation", EntryDate = new DateTime(2025, 7, 1, 0, 0, 0, DateTimeKind.Utc) },
            new CapitalEntry { Type = "Loan", Amount = 100000, Source = "Family loan", PaymentMethod = "Bank Transfer", Note = "Interest-free family loan", EntryDate = new DateTime(2025, 9, 15, 0, 0, 0, DateTimeKind.Utc) },
            new CapitalEntry { Type = "Withdrawal", Amount = 50000, Source = "Owner", PaymentMethod = "Bank Transfer", Note = "Owner drawing", EntryDate = new DateTime(2025, 12, 20, 0, 0, 0, DateTimeKind.Utc) },
            new CapitalEntry { Type = "Investment", Amount = 200000, Source = "Owner", PaymentMethod = "Bank Transfer", Note = "New season inventory", EntryDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc) },
            new CapitalEntry { Type = "Investment", Amount = 150000, Source = "Owner", PaymentMethod = "Bank Transfer", Note = "Summer collection buy", EntryDate = new DateTime(2026, 5, 5, 0, 0, 0, DateTimeKind.Utc) },
            new CapitalEntry { Type = "Investment", Amount = 100000, Source = "Owner", PaymentMethod = "Bank Transfer", Note = "Working capital top-up", EntryDate = new DateTime(2026, 8, 3, 0, 0, 0, DateTimeKind.Utc) },
            new CapitalEntry { Type = "Withdrawal", Amount = 40000, Source = "Owner", PaymentMethod = "Bank Transfer", Note = "Owner drawing", EntryDate = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc) }
        }, cancellationToken: ct);

        await _database.GetCollection<ExpenseEntry>("ExpenseEntries").InsertManyAsync(new[]
        {
            new ExpenseEntry { Category = "Rent", Title = "Showroom rent - August", Amount = 1200, Vendor = "Mirpur Property Holdings", PaymentMethod = "Bank Transfer", ExpenseDate = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc) },
            new ExpenseEntry { Category = "Rent", Title = "Showroom rent - September", Amount = 1200, Vendor = "Mirpur Property Holdings", PaymentMethod = "Bank Transfer", ExpenseDate = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc) },
            new ExpenseEntry { Category = "Marketing", Title = "Meta ads campaign", Amount = 850, Vendor = "Meta", PaymentMethod = "Card", ExpenseDate = new DateTime(2026, 9, 14, 0, 0, 0, DateTimeKind.Utc) },
            new ExpenseEntry { Category = "Rent", Title = "Showroom rent - October", Amount = 1200, Vendor = "Mirpur Property Holdings", PaymentMethod = "Bank Transfer", ExpenseDate = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc) },
            new ExpenseEntry { Category = "Utilities", Title = "Internet and utilities", Amount = 320, Vendor = "Link3 / DPDC", PaymentMethod = "Cash", ExpenseDate = new DateTime(2026, 10, 6, 0, 0, 0, DateTimeKind.Utc) },
            new ExpenseEntry { Category = "Transport", Title = "Courier and packaging", Amount = 640, Vendor = "Sundarban Courier", PaymentMethod = "Cash", ExpenseDate = new DateTime(2026, 10, 20, 0, 0, 0, DateTimeKind.Utc) },
            new ExpenseEntry { Category = "Rent", Title = "Showroom rent - November", Amount = 1200, Vendor = "Mirpur Property Holdings", PaymentMethod = "Bank Transfer", ExpenseDate = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc) },
            new ExpenseEntry { Category = "Packaging", Title = "Packaging materials", Amount = 480, Vendor = "Dhaka Packaging", PaymentMethod = "Cash", ExpenseDate = new DateTime(2026, 11, 5, 0, 0, 0, DateTimeKind.Utc) }
        }, cancellationToken: ct);

        var products = await _database.GetCollection<Product>("Products")
            .Find(Builders<Product>.Filter.Eq(p => p.IsDeleted, false))
            .Sort(Builders<Product>.Sort.Descending(p => p.SoldCount))
            .Limit(6)
            .ToListAsync(ct);

        if (products.Count > 0)
        {
            var suppliers = new[] { "Dhaka Wholesale Ltd", "Aurelia Distribution", "Nordform BD", "Kestrel Supply Co." };
            var arrivals = new List<StockArrival>();
            for (var i = 0; i < Math.Min(products.Count, 6); i++)
            {
                var product = products[i];
                arrivals.Add(new StockArrival
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Quantity = 20 + i * 5,
                    UnitCost = product.CostPrice > 0 ? product.CostPrice : Math.Round(product.Price * 0.55m, 2),
                    Supplier = suppliers[i % suppliers.Length],
                    Reference = $"GRN-2026-{(i + 1):000}",
                    Note = "Opening purchase recorded during onboarding",
                    ArrivalDate = new DateTime(2026, 8 + i % 3, 4 + i, 0, 0, 0, DateTimeKind.Utc),
                    StockApplied = false
                });
            }
            await _database.GetCollection<StockArrival>("StockArrivals").InsertManyAsync(arrivals, cancellationToken: ct);
        }

        await SeedBusinessOrderHistoryAsync(products, ct);
    }

    private async Task SeedBusinessOrderHistoryAsync(List<Product> products, CancellationToken ct)
    {
        if (products.Count == 0) return;
        var customer = await _database.GetCollection<User>("Users")
            .Find(Builders<User>.Filter.Eq(u => u.Role, AppRoles.Customer))
            .FirstOrDefaultAsync(ct);
        if (customer is null) return;

        var orders = new List<Order>();
        var payments = new List<Payment>();
        var now = DateTime.UtcNow;
        for (var i = 0; i < 9; i++)
        {
            var product = products[(i * 2) % products.Count];
            var quantity = i % 3 == 0 ? 2 : 1;
            var created = new DateTime(now.Year, now.Month, 1, 10, 0, 0, DateTimeKind.Utc)
                .AddMonths(-i).AddDays(2 + i);
            if (created > now) created = now.AddHours(-6);
            var subtotal = Math.Round(product.EffectivePrice * quantity, 2);
            var total = Math.Round(subtotal + 10, 2);
            var order = new Order
            {
                OrderNumber = $"ORD-{created:yyyyMMdd}-{900100 + i}",
                UserId = customer.Id,
                CustomerName = customer.FullName,
                CustomerEmail = customer.Email,
                CustomerPhone = customer.Phone ?? "01700000000",
                Items = new List<OrderItem>
                {
                    new()
                    {
                        ProductId = product.Id,
                        ProductName = product.Name,
                        Sku = product.Sku,
                        ImageUrl = product.ThumbnailUrl,
                        UnitPrice = product.EffectivePrice,
                        UnitCost = product.CostPrice,
                        Quantity = quantity,
                        LineTotal = subtotal
                    }
                },
                ShippingAddress = new AddressSnapshot
                {
                    FullName = customer.FullName,
                    Phone = customer.Phone ?? "01700000000",
                    Street = "House 12, Road 5, Mirpur",
                    City = "Dhaka",
                    State = "Dhaka",
                    PostalCode = "1216",
                    Country = "Bangladesh"
                },
                ShippingMethodName = "Standard Delivery",
                ShippingCost = 10,
                Subtotal = subtotal,
                Total = total,
                Status = OrderStatus.Completed,
                PaymentMethod = PaymentProviders.Cod,
                PaymentStatus = PaymentStatus.Paid,
                InventoryCommitted = true,
                CreatedAt = created,
                ShippedAt = created.AddDays(1),
                CompletedAt = created.AddDays(2)
            };
            order.StatusHistory.Add(new OrderStatusHistory { Status = OrderStatus.Pending, Note = "Order placed", ChangedAt = created });
            order.StatusHistory.Add(new OrderStatusHistory { Status = OrderStatus.Confirmed, Note = "Payment confirmed", ChangedAt = created.AddMinutes(10) });
            order.StatusHistory.Add(new OrderStatusHistory { Status = OrderStatus.Shipped, Note = "Handed to carrier", ChangedAt = created.AddDays(1) });
            order.StatusHistory.Add(new OrderStatusHistory { Status = OrderStatus.Completed, Note = "Delivered", ChangedAt = created.AddDays(2) });
            orders.Add(order);
            payments.Add(new Payment
            {
                OrderId = order.Id,
                OrderNumber = order.OrderNumber,
                UserId = customer.Id,
                Provider = PaymentProviders.Cod,
                Amount = total,
                Currency = "USD",
                Status = PaymentStatus.Paid,
                TransactionId = $"SEED-TXN-{900100 + i}",
                CreatedAt = created
            });
        }
        await _database.GetCollection<Order>("Orders").InsertManyAsync(orders, cancellationToken: ct);
        await _database.GetCollection<Payment>("Payments").InsertManyAsync(payments, cancellationToken: ct);
    }

    private async Task<Dictionary<string, Role>> SeedRolesAsync(CancellationToken ct)
    {
        var collection = _database.GetCollection<Role>("Roles");
        var roles = new Dictionary<string, Role>();
        foreach (var name in new[] { AppRoles.SuperAdmin, AppRoles.Admin, AppRoles.Manager, AppRoles.Staff, AppRoles.Customer })
        {
            var role = new Role
            {
                Name = name,
                Description = $"{name} role",
                Permissions = Permissions.RoleDefaults.GetValueOrDefault(name, Array.Empty<string>()).ToList(),
                IsSystem = true
            };
            await collection.InsertOneAsync(role, cancellationToken: ct);
            roles[name] = role;
        }
        return roles;
    }

    private async Task<List<Permission>> SeedPermissionsAsync(CancellationToken ct)
    {
        var collection = _database.GetCollection<Permission>("Permissions");
        var permissions = Permissions.All.Select(key => new Permission
        {
            Key = key,
            Name = key.Split('.')[1],
            Group = key.Split('.')[0],
            Description = $"Allows {key.Split('.')[1]} access for {key.Split('.')[0]}"
        }).ToList();
        await collection.InsertManyAsync(permissions, cancellationToken: ct);
        return permissions;
    }

    private async Task<Dictionary<string, User>> SeedUsersAsync(Dictionary<string, Role> roles, CancellationToken ct)
    {
        var collection = _database.GetCollection<User>("Users");
        var admin = new User
        {
            FirstName = "Avery",
            LastName = "Stone",
            Email = "admin@luxe.store",
            PasswordHash = _passwordHasher.Hash("Admin@12345"),
            Role = AppRoles.SuperAdmin,
            Permissions = roles[AppRoles.SuperAdmin].Permissions,
            EmailVerified = true,
            Phone = "01700000000",
            IsActive = true
        };
        var manager = new User
        {
            FirstName = "Jordan",
            LastName = "Reed",
            Email = "manager@luxe.store",
            PasswordHash = _passwordHasher.Hash("Manager@12345"),
            Role = AppRoles.Manager,
            Permissions = roles[AppRoles.Manager].Permissions,
            EmailVerified = true,
            IsActive = true
        };
        var customer = new User
        {
            FirstName = "Casey",
            LastName = "Morgan",
            Email = "customer@luxe.store",
            PasswordHash = _passwordHasher.Hash("Customer@12345"),
            Role = AppRoles.Customer,
            Permissions = new List<string>(),
            EmailVerified = true,
            Phone = "01700000000",
            IsActive = true
        };
        await collection.InsertManyAsync(new[] { admin, manager, customer }, cancellationToken: ct);
        return new Dictionary<string, User>
        {
            [AppRoles.SuperAdmin] = admin,
            [AppRoles.Manager] = manager,
            [AppRoles.Customer] = customer
        };
    }

    private async Task<WebsiteSettings> SeedSettingsAsync(CancellationToken ct)
    {
        var collection = _database.GetCollection<WebsiteSettings>("WebsiteSettings");
        var settings = new WebsiteSettings
        {
            StoreName = "Safwan",
            Tagline = "Curated essentials for modern living",
            Email = "hello@safwan.store",
            Phone = "01700000000",
            Address = "Mirpur, Dhaka, Bangladesh",
            Currency = "USD",
            CurrencySymbol = "$",
            TaxRate = 5,
            FlatShippingRate = 10,
            FreeShippingThreshold = 150,
            CodEnabled = true,
            StripeEnabled = false,
            SslCommerzEnabled = false,
            BkashEnabled = true,
            BkashMerchantNumber = "01700000000",
            NagadEnabled = true,
            NagadMerchantNumber = "01700000000",
            RocketEnabled = true,
            RocketMerchantNumber = "01700000000",
            VoucherPointsEnabled = true,
            VoucherPointValue = 1,
            VoucherEarnPercent = 5,
            VoucherMaxRedeemPercent = 100,
            SocialLinks = new Dictionary<string, string>
            {
                ["instagram"] = "https://instagram.com",
                ["facebook"] = "https://facebook.com",
                ["x"] = "https://x.com"
            },
            FooterAbout = "Thoughtfully selected products from independent makers and trusted brands, delivered with care.",
            CopyrightText = $"© {DateTime.UtcNow.Year} Safwan. All rights reserved.",
            MenuItems = new List<MenuItem>
            {
                new() { Label = "Shop", Url = "/products", SortOrder = 1 },
                new() { Label = "New Arrivals", Url = "/products?sort=newest", SortOrder = 2 },
                new() { Label = "Sale", Url = "/products?onSale=true", SortOrder = 3 },
                new() { Label = "About", Url = "/about", SortOrder = 4 },
                new() { Label = "Contact", Url = "/contact", SortOrder = 5 }
            }
        };
        await collection.InsertOneAsync(settings, cancellationToken: ct);
        return settings;
    }

    private async Task<List<ShippingMethod>> SeedShippingMethodsAsync(CancellationToken ct)
    {
        var methods = new List<ShippingMethod>
        {
            new() { Name = "Standard Delivery", Description = "Delivered in 4-6 business days", Cost = 10, EstimatedDaysMin = 4, EstimatedDaysMax = 6, IsDefault = true },
            new() { Name = "Express Delivery", Description = "Delivered in 2-3 business days", Cost = 20, EstimatedDaysMin = 2, EstimatedDaysMax = 3 },
            new() { Name = "Priority Overnight", Description = "Order by 2pm for next-day delivery", Cost = 35, EstimatedDaysMin = 1, EstimatedDaysMax = 1 },
            new() { Name = "Free In-Store Pickup", Description = "Pick up at our Mirpur store", Cost = 0, EstimatedDaysMin = 1, EstimatedDaysMax = 2 }
        };
        await _database.GetCollection<ShippingMethod>("ShippingMethods").InsertManyAsync(methods, cancellationToken: ct);
        return methods;
    }

    private async Task<Dictionary<string, Category>> SeedCategoriesAsync(CancellationToken ct)
    {
        var collection = _database.GetCollection<Category>("Categories");
        var women = new Category { Name = "Women", Slug = "women", SortOrder = 1, Description = "Refined everyday pieces and occasion wear.", ImageUrl = Img("1490481651871-ab68de25d43d") };
        var men = new Category { Name = "Men", Slug = "men", SortOrder = 2, Description = "Modern tailoring and relaxed essentials.", ImageUrl = Img("1488161628813-04466f872be2") };
        var accessories = new Category { Name = "Accessories", Slug = "accessories", SortOrder = 3, Description = "Leather goods, eyewear and finishing touches.", ImageUrl = Img("1523275335684-37898b6baf30") };
        var footwear = new Category { Name = "Footwear", Slug = "footwear", SortOrder = 4, Description = "Sneakers, boots and everyday classics.", ImageUrl = Img("1542291026-7eec264c27ff") };
        var beauty = new Category { Name = "Beauty", Slug = "beauty", SortOrder = 5, Description = "Clean skincare and considered fragrance.", ImageUrl = Img("1596462502278-27bfdc403348") };
        var home = new Category { Name = "Home & Living", Slug = "home-living", SortOrder = 6, Description = "Objects that make a house a home.", ImageUrl = Img("1616486338812-3dadae4b4ace") };
        var baby = new Category { Name = "Baby", Slug = "baby", SortOrder = 7, Description = "Gentle clothing and care essentials for little ones.", ImageUrl = Img("1519689680058-324335c77eba") };

        await collection.InsertManyAsync(new[] { women, men, accessories, footwear, beauty, home, baby }, cancellationToken: ct);

        var dresses = new Category { Name = "Dresses", Slug = "dresses", ParentId = women.Id, SortOrder = 1 };
        var knitwear = new Category { Name = "Knitwear", Slug = "knitwear", ParentId = women.Id, SortOrder = 2 };
        var outerwear = new Category { Name = "Outerwear", Slug = "outerwear", ParentId = men.Id, SortOrder = 1 };
        var shirts = new Category { Name = "Shirts", Slug = "shirts", ParentId = men.Id, SortOrder = 2 };
        var bags = new Category { Name = "Bags", Slug = "bags", ParentId = accessories.Id, SortOrder = 1 };
        await collection.InsertManyAsync(new[] { dresses, knitwear, outerwear, shirts, bags }, cancellationToken: ct);

        return new Dictionary<string, Category>
        {
            ["women"] = women, ["men"] = men, ["accessories"] = accessories, ["footwear"] = footwear,
            ["beauty"] = beauty, ["home"] = home, ["baby"] = baby, ["dresses"] = dresses, ["knitwear"] = knitwear,
            ["outerwear"] = outerwear, ["shirts"] = shirts, ["bags"] = bags
        };
    }

    private async Task<Dictionary<string, Brand>> SeedBrandsAsync(CancellationToken ct)
    {
        var collection = _database.GetCollection<Brand>("Brands");
        var brands = new Dictionary<string, Brand>
        {
            ["aurelia"] = new() { Name = "Aurelia", Slug = "aurelia", SortOrder = 1, Description = "Softly tailored womenswear." },
            ["nordform"] = new() { Name = "Nordform", Slug = "nordform", SortOrder = 2, Description = "Scandinavian menswear essentials." },
            ["kestrel"] = new() { Name = "Kestrel", Slug = "kestrel", SortOrder = 3, Description = "Performance footwear and sportswear." },
            ["lumen"] = new() { Name = "Lumen", Slug = "lumen", SortOrder = 4, Description = "Clean beauty and skincare." },
            ["atelier-noa"] = new() { Name = "Atelier Noa", Slug = "atelier-noa", SortOrder = 5, Description = "Handcrafted leather goods." }
        };
        await collection.InsertManyAsync(brands.Values, cancellationToken: ct);
        return brands;
    }

    private async Task<List<Product>> SeedProductsAsync(Dictionary<string, Category> categories,
        Dictionary<string, Brand> brands, CancellationToken ct)
    {
        var seeds = new List<ProductSeed>
        {
            new("Silk Wrap Midi Dress", "AUR-DR-001", "dresses", "aurelia", 189, 149, "A fluid silk-blend wrap dress with a soft drape and tie waist. Cut to a flattering midi length for day-to-evening wear.", "Ivory", 6, true, 86, 4.8,
                new[] { "1515372039744-b8f02a3ae446", "1490481651871-ab68de25d43d" }, new[] { "New", "Silk", "Dresses" },
                new() { ["Material"] = "70% silk, 30% viscose", ["Fit"] = "True to size", ["Care"] = "Dry clean only" },
                Variants("Ivory", "Black", sizes: new[] { "XS", "S", "M", "L", "XL" }, stockPerVariant: 7)),
            new("Ribbed Knit Turtleneck", "AUR-KN-002", "knitwear", "aurelia", 89, null, "A second-skin ribbed knit with a relaxed turtleneck. Layer it under tailoring or wear alone.", "Oat", 10, false, 54, 4.6,
                new[] { "1434389677669-e08b4cac3105" }, new[] { "Knit", "Layering" },
                new() { ["Material"] = "Cotton blend", ["Fit"] = "Slim" },
                Variants("Oat", "Charcoal", sizes: new[] { "S", "M", "L" }, stockPerVariant: 10)),
            new("Linen Wide-Leg Trousers", "AUR-TR-003", "women", "aurelia", 79, 59, "Breathable washed linen with a high rise and easy wide leg. An effortless warm-weather staple.", "Sand", 8, true, 42, 4.5,
                new[] { "1594633312681-425c7b97ccd1" }, new[] { "Linen", "Summer" },
                new() { ["Material"] = "100% linen", ["Fit"] = "Relaxed" },
                Variants("Sand", "Navy", sizes: new[] { "XS", "S", "M", "L" }, stockPerVariant: 8)),
            new("Oversized Wool Blazer", "AUR-JK-004", "women", "aurelia", 169, null, "A relaxed double-breasted blazer in brushed wool with a strong shoulder and satin lining.", "Camel", 12, true, 31, 4.7,
                new[] { "1591047139829-d91aecb6caea" }, new[] { "Tailoring", "Wool" },
                new() { ["Material"] = "80% wool, 20% polyamide", ["Fit"] = "Oversized" }),
            new("Cashmere Blend Scarf", "AUR-AC-005", "accessories", "aurelia", 65, null, "Feather-light cashmere blend scarf with hand-rolled edges.", "Grey", 25, false, 63, 4.4,
                new[] { "1601924994987-69e26d50dc26" }, new[] { "Cashmere", "Gift" },
                new() { ["Material"] = "90% wool, 10% cashmere" }),

            new("Tailored Oxford Shirt", "NOR-SH-001", "shirts", "nordform", 79, null, "Washed cotton oxford with a clean collar and a slightly relaxed cut.", "White", 15, true, 72, 4.6,
                new[] { "1596755094514-f87e34085b2c" }, new[] { "Shirts", "Classic" },
                new() { ["Material"] = "100% cotton oxford", ["Fit"] = "Regular" },
                Variants("White", "Sky Blue", sizes: new[] { "S", "M", "L", "XL" }, stockPerVariant: 9)),
            new("Merino Crew Sweater", "NOR-KN-002", "men", "nordform", 110, 88, "Fine-gauge extra-fine merino with a classic crew neck. Temperature regulating and soft against the skin.", "Navy", 9, false, 58, 4.8,
                new[] { "1576566588028-4147f3842f27" }, new[] { "Merino", "Knitwear" },
                new() { ["Material"] = "100% extra-fine merino", ["Fit"] = "Regular" },
                Variants("Navy", "Slate", sizes: new[] { "S", "M", "L", "XL" }, stockPerVariant: 8)),
            new("Slim Fit Stretch Chinos", "NOR-TR-003", "men", "nordform", 69, null, "Garment-dyed stretch chinos with a clean slim leg and comfortable mid rise.", "Stone", 20, false, 47, 4.3,
                new[] { "1473966968600-fa801b869a1a" }, new[] { "Chinos", "Everyday" },
                new() { ["Material"] = "98% cotton, 2% elastane", ["Fit"] = "Slim" },
                Variants("Stone", "Olive", sizes: new[] { "30", "32", "34", "36" }, stockPerVariant: 9)),
            new("Wool Blend Overcoat", "NOR-OW-004", "outerwear", "nordform", 249, null, "A clean-lined overcoat in a warm wool blend with a concealed placket and deep pockets.", "Charcoal", 14, true, 22, 4.9,
                new[] { "1544022613-e87ca75a784a" }, new[] { "Outerwear", "Wool" },
                new() { ["Material"] = "70% wool, 30% recycled poly", ["Fit"] = "Regular" }),
            new("Classic Denim Jacket", "NOR-JK-005", "men", "nordform", 119, null, "Rigid denim jacket with copper hardware and a lived-in wash that gets better with wear.", "Indigo", 18, false, 39, 4.5,
                new[] { "1551028719-00167b16eac5" }, new[] { "Denim", "Layering" },
                new() { ["Material"] = "100% cotton denim", ["Fit"] = "Regular" }),
            new("Performance Cotton Tee", "NOR-TE-006", "men", "nordform", 35, 25, "Lightweight supima cotton with a subtle stretch and a clean neckline.", "Black", 40, false, 120, 4.4,
                new[] { "1521572163474-6864f9cf17ab" }, new[] { "Basics", "Cotton" },
                new() { ["Material"] = "95% supima cotton, 5% elastane" },
                Variants("Black", "White", sizes: new[] { "S", "M", "L", "XL" }, stockPerVariant: 12)),

            new("Leather Weekender Bag", "NOA-BG-001", "bags", "atelier-noa", 229, 199, "Full-grain leather weekender with a cotton canvas lining and detachable shoulder strap.", "Cognac", 6, true, 28, 4.9,
                new[] { "1553062407-98eeb64c6a62" }, new[] { "Leather", "Travel" },
                new() { ["Material"] = "Full-grain leather", ["Dimensions"] = "48 x 28 x 22 cm" }),
            new("Minimalist Leather Wallet", "NOA-BG-002", "accessories", "atelier-noa", 49, null, "Slim bifold wallet in vegetable-tanned leather with six card slots.", "Black", 30, false, 88, 4.6,
                new[] { "1627123424574-724758594e93" }, new[] { "Leather", "Gift" },
                new() { ["Material"] = "Vegetable-tanned leather" }),
            new("Classic Aviator Sunglasses", "LUX-AC-003", "accessories", "aurelia", 129, 99, "Lightweight metal aviators with polarized lenses and UV400 protection.", "Gold", 16, true, 66, 4.5,
                new[] { "1572635196237-14b3f281503f" }, new[] { "Eyewear", "Summer" },
                new() { ["Lens"] = "Polarized", ["Protection"] = "UV400" }),
            new("Merino Rib Beanie", "LUX-AC-004", "accessories", "aurelia", 39, null, "A rib-knit beanie in soft merino with a double turn-up cuff.", "Cream", 35, false, 51, 4.2,
                new[] { "1525966222134-fcfa99b8ae77" }, new[] { "Knit", "Winter" },
                new() { ["Material"] = "100% merino wool" }),
            new("Chronograph Steel Watch", "LUX-AC-005", "accessories", "aurelia", 189, 159, "A 40mm chronograph with brushed stainless steel case and sapphire crystal.", "Silver", 9, true, 34, 4.7,
                new[] { "1523275335684-37898b6baf30" }, new[] { "Watches", "Gift" },
                new() { ["Case"] = "40mm stainless steel", ["Movement"] = "Japanese quartz" }),
            new("Structured Leather Tote", "NOA-BG-006", "bags", "atelier-noa", 175, null, "A structured tote with a magnetic closure and interior zip pocket. Fits a 13-inch laptop.", "Taupe", 11, false, 44, 4.8,
                new[] { "1584917865442-de89df76afd3" }, new[] { "Leather", "Work" },
                new() { ["Material"] = "Pebbled leather", ["Dimensions"] = "32 x 26 x 12 cm" }),

            new("Court Leather Sneakers", "KES-FW-001", "footwear", "kestrel", 135, null, "Minimal leather court sneakers with a cushioned insole and rubber cupsole.", "White", 13, true, 92, 4.6,
                new[] { "1600185365926-3a2ce3cdb9eb" }, new[] { "Sneakers", "Leather" },
                new() { ["Upper"] = "Full-grain leather", ["Sole"] = "Rubber" },
                Variants("White", "Black", sizes: new[] { "7", "8", "9", "10", "11" }, stockPerVariant: 9)),
            new("Everyday Running Shoe", "KES-FW-002", "footwear", "kestrel", 119, 95, "A responsive daily trainer with breathable engineered mesh and a foam midsole.", "Coral", 10, false, 76, 4.4,
                new[] { "1542291026-7eec264c27ff" }, new[] { "Running", "Performance" },
                new() { ["Drop"] = "8mm", ["Weight"] = "248g" },
                Variants("Coral", "Black", sizes: new[] { "7", "8", "9", "10", "11", "12" }, stockPerVariant: 8)),
            new("Suede Chelsea Boots", "KES-FW-003", "footwear", "kestrel", 179, null, "Classic Chelsea boots in water-resistant suede with elastic side panels and a stacked heel.", "Umber", 5, false, 26, 4.7,
                new[] { "1608256246200-53e635b5b65f" }, new[] { "Boots", "Suede" },
                new() { ["Upper"] = "Water-resistant suede", ["Sole"] = "Leather" },
                Variants("Umber", "Black", sizes: new[] { "8", "9", "10", "11" }, stockPerVariant: 5)),
            new("Canvas Low-Top Sneakers", "KES-FW-004", "footwear", "kestrel", 59, null, "Organic cotton canvas low-tops with a vulcanized rubber sole.", "Ecru", 28, false, 70, 4.1,
                new[] { "1460353581641-37baddab0fa2" }, new[] { "Canvas", "Everyday" },
                new() { ["Upper"] = "Organic cotton canvas", ["Sole"] = "Vulcanized rubber" }),

            new("Botanical Renewal Serum", "LUM-BE-001", "beauty", "lumen", 48, null, "A lightweight botanical serum with niacinamide and hyaluronic acid for a smoother, hydrated finish.", "30ml", 40, true, 108, 4.8,
                new[] { "1620916566398-39f1143ab7be" }, new[] { "Skincare", "Vegan" },
                new() { ["Volume"] = "30ml", ["Skin type"] = "All skin types" }),
            new("Hydrating Day Cream", "LUM-BE-002", "beauty", "lumen", 42, 36, "A ceramide-rich day cream that strengthens the skin barrier with a weightless finish.", "50ml", 25, false, 84, 4.6,
                new[] { "1571781926291-c477ebfd024b" }, new[] { "Skincare", "Hydration" },
                new() { ["Volume"] = "50ml", ["SPF"] = "None" }),
            new("Amber Noir Eau de Parfum", "LUM-BE-003", "beauty", "lumen", 120, null, "Warm amber, smoked cedar and a hint of vanilla. A quiet, lasting signature.", "50ml", 12, true, 47, 4.9,
                new[] { "1585386959984-a4155224a1ad" }, new[] { "Fragrance", "Gift" },
                new() { ["Volume"] = "50ml", ["Notes"] = "Amber, cedar, vanilla" }),

            new("Handwoven Cotton Throw", "LUX-HM-001", "home", "aurelia", 89, null, "A generously sized throw woven from recycled cotton with a soft brushed finish.", "Rust", 14, false, 33, 4.5,
                new[] { "1580301762395-21ce84d00bc6" }, new[] { "Home", "Textiles" },
                new() { ["Material"] = "Recycled cotton", ["Size"] = "130 x 180 cm" }),
            new("Stoneware Dinner Set", "LUX-HM-002", "home", "aurelia", 129, 109, "A four-piece reactive glaze stoneware set. Each piece is subtly unique.", "Sand", 8, true, 21, 4.6,
                new[] { "1610701596007-11502861dcfa" }, new[] { "Home", "Tableware" },
                new() { ["Material"] = "Stoneware", ["Pieces"] = "4" }),
            new("Cedar & Amber Candle", "LUX-HM-003", "home", "lumen", 32, null, "Hand-poured soy candle with cedar, amber and a touch of vetiver. 45-hour burn time.", "45h", 50, false, 96, 4.7,
                new[] { "1603006905003-be475563bc59" }, new[] { "Home", "Fragrance" },
                new() { ["Wax"] = "Soy", ["Burn time"] = "45 hours" }),
            new("Sculptural Ceramic Vase", "LUX-HM-004", "home", "aurelia", 58, null, "A matte-glazed ceramic vase with an organic, hand-thrown silhouette.", "Chalk", 18, false, 37, 4.4,
                new[] { "1616486338812-3dadae4b4ace" }, new[] { "Home", "Decor" },
                new() { ["Material"] = "Ceramic", ["Height"] = "28 cm" }),

            new("Organic Cotton Baby Bodysuit", "SAF-BY-001", "baby", "aurelia", 24, null, "A supersoft bodysuit in GOTS-certified organic cotton with envelope shoulders and snap fastenings for easy changes.", "Oat", 10, false, 18, 4.7,
                new[] { "1519689680058-324335c77eba" }, new[] { "Baby", "Organic" },
                new() { ["Material"] = "100% organic cotton", ["Care"] = "Machine wash cold" },
                Variants("Oat", "Sky", sizes: new[] { "0-3M", "3-6M", "6-12M" }, stockPerVariant: 8)),
            new("Soft Knit Baby Blanket", "SAF-BY-002", "baby", "aurelia", 38, 32, "A breathable cellular blanket knitted from traceable cotton, sized for cots and prams and finished with a gentle rolled edge.", "Blush", 22, true, 25, 4.8,
                new[] { "1580301762395-21ce84d00bc6" }, new[] { "Baby", "Gift" },
                new() { ["Material"] = "100% cotton", ["Size"] = "75 x 100 cm" })
        };

        var products = new List<Product>();
        foreach (var seed in seeds)
        {
            var category = categories[seed.CategoryKey];
            var brand = brands[seed.BrandKey];
            var variants = seed.Variants ?? new List<ProductVariant>();
            var stock = variants.Count > 0 ? 0 : seed.Stock;
            var product = new Product
            {
                Name = seed.Name,
                Slug = seed.Name.ToSlug(),
                Sku = seed.Sku,
                ShortDescription = seed.Description.Split('.')[0] + ".",
                Description = seed.Description + " Designed in-house and made with responsibly sourced materials.",
                CategoryId = category.Id,
                BrandId = brand.Id,
                Price = seed.Price,
                DiscountPrice = seed.DiscountPrice,
                Stock = stock,
                LowStockThreshold = 5,
                Images = seed.Images.Select(Img).ToList(),
                ThumbnailUrl = Img(seed.Images[0]),
                Specifications = seed.Specifications,
                Variants = variants,
                Tags = seed.Tags.ToList(),
                IsFeatured = seed.Featured,
                IsActive = true,
                SoldCount = seed.Sold,
                RatingAverage = seed.Rating,
                ReviewCount = 0,
                ViewCount = seed.Sold * 6 + 40,
                SeoTitle = $"{seed.Name} | Safwan",
                SeoDescription = seed.Description,
                CreatedAt = DateTime.UtcNow.AddDays(-(30 + (seeds.IndexOf(seed) * 3) % 90))
            };
            foreach (var variant in product.Variants.Where(v => v.Price <= 0))
                variant.Price = product.EffectivePrice;
            products.Add(product);
        }

        await _database.GetCollection<Product>("Products").InsertManyAsync(products, cancellationToken: ct);
        return products;
    }

    private async Task SeedBannersAsync(CancellationToken ct)
    {
        var banners = new List<Banner>
        {
            new()
            {
                Title = "The Safwan Edit",
                Subtitle = "Timeless pieces, considered materials and effortless silhouettes for the season ahead.",
                ImageUrl = Img("1490481651871-ab68de25d43d"),
                LinkUrl = "/products?sort=newest",
                ButtonText = "Shop the edit",
                Position = "Hero",
                SortOrder = 1,
                IsActive = true
            },
            new()
            {
                Title = "Up to 30% off elevated essentials",
                Subtitle = "Limited-time pricing on knitwear, outerwear and leather goods.",
                ImageUrl = Img("1489987707025-afc232f7ea0f"),
                LinkUrl = "/products?onSale=true",
                ButtonText = "Shop the sale",
                Position = "Hero",
                SortOrder = 2,
                IsActive = true
            },
            new()
            {
                Title = "New season, new rituals",
                Subtitle = "Clean skincare and comforting home fragrance from Lumen.",
                ImageUrl = Img("1596462502278-27bfdc403348"),
                LinkUrl = "/category/beauty",
                ButtonText = "Discover beauty",
                Position = "Hero",
                SortOrder = 3,
                IsActive = true
            },
            new()
            {
                Title = "Crafted to last",
                Subtitle = "Full-grain leather goods from Atelier Noa, made in small batches.",
                ImageUrl = Img("1553062407-98eeb64c6a62"),
                LinkUrl = "/category/accessories",
                ButtonText = "Explore leather",
                Position = "Promo",
                SortOrder = 1,
                IsActive = true
            },
            new()
            {
                Title = "Comfort, elevated",
                Subtitle = "Everyday sneakers and boots designed for the long walk home.",
                ImageUrl = Img("1600185365926-3a2ce3cdb9eb"),
                LinkUrl = "/category/footwear",
                ButtonText = "Shop footwear",
                Position = "Promo",
                SortOrder = 2,
                IsActive = true
            }
        };
        await _database.GetCollection<Banner>("Banners").InsertManyAsync(banners, cancellationToken: ct);
    }

    private async Task SeedTestimonialsAsync(CancellationToken ct)
    {
        var testimonials = new List<Testimonial>
        {
            new() { Name = "Priya N.", Role = "Verified buyer", Rating = 5, Quote = "The packaging alone felt like a gift. Quality is genuinely on another level.", SortOrder = 1 },
            new() { Name = "Marcus L.", Role = "Verified buyer", Rating = 5, Quote = "Ordered the merino sweater on a Friday and wore it by Monday. Beautifully soft.", SortOrder = 2 },
            new() { Name = "Elena R.", Role = "Verified buyer", Rating = 4, Quote = "Thoughtful curation — I found pieces I would never have discovered elsewhere.", SortOrder = 3 },
            new() { Name = "Sam K.", Role = "Verified buyer", Rating = 5, Quote = "Customer care answered within minutes and sorted my exchange without any fuss.", SortOrder = 4 }
        };
        await _database.GetCollection<Testimonial>("Testimonials").InsertManyAsync(testimonials, cancellationToken: ct);
    }

    private async Task SeedCouponsAsync(Dictionary<string, User> users, CancellationToken ct)
    {
        var coupons = new List<Coupon>
        {
            new()
            {
                Code = "WELCOME10", Description = "10% off your first order", Type = "Percentage",
                Value = 10, MinimumPurchase = 50, MaximumDiscount = 40, PerUserLimit = 1,
                UsageLimit = 500, UsedCount = 3, IsActive = true
            },
            new()
            {
                Code = "SAVE20", Description = "20 off orders over 150", Type = "Fixed",
                Value = 20, MinimumPurchase = 150, PerUserLimit = 2, UsageLimit = 200, UsedCount = 0,
                IsActive = true, ExpiresAt = DateTime.UtcNow.AddMonths(2)
            },
            new()
            {
                Code = "SUMMER15", Description = "15% off summer styles", Type = "Percentage",
                Value = 15, MinimumPurchase = 100, MaximumDiscount = 60, PerUserLimit = 1,
                UsageLimit = 100, UsedCount = 0, IsActive = true,
                StartsAt = DateTime.UtcNow.AddDays(-10), ExpiresAt = DateTime.UtcNow.AddDays(30)
            },
            new()
            {
                Code = "VIP25", Description = "Exclusive 25% for our top customers", Type = "Percentage",
                Value = 25, MinimumPurchase = 200, MaximumDiscount = 100, PerUserLimit = 1,
                UsageLimit = 50, UsedCount = 0, IsActive = true,
                UserIds = new List<ObjectId> { users[AppRoles.Customer].Id }
            }
        };
        await _database.GetCollection<Coupon>("Coupons").InsertManyAsync(coupons, cancellationToken: ct);
    }

    private async Task SeedReviewsAsync(List<Product> products, Dictionary<string, User> users, CancellationToken ct)
    {
        var customer = users[AppRoles.Customer];
        var reviewer = users[AppRoles.Manager];
        var reviews = new List<ProductReview>();
        var texts = new[]
        {
            ("Exactly as described", "The quality exceeded my expectations. Beautifully finished and true to size."),
            ("Worth every penny", "I have worn this constantly since it arrived. The material feels premium."),
            ("Lovely, with one small note", "Gorgeous piece overall. I would size up if you prefer a looser fit."),
            ("A new favourite", "Packaging was beautiful and the piece is even better in person.")
        };

        for (var i = 0; i < 6 && i < products.Count; i++)
        {
            var product = products[i];
            var (title, comment) = texts[i % texts.Length];
            reviews.Add(new ProductReview
            {
                ProductId = product.Id,
                UserId = customer.Id,
                UserName = customer.FullName,
                Rating = 5 - (i % 2),
                Title = title,
                Comment = comment,
                IsApproved = true,
                IsVerifiedPurchase = true,
                CreatedAt = DateTime.UtcNow.AddDays(-(i * 4 + 2))
            });
            reviews.Add(new ProductReview
            {
                ProductId = product.Id,
                UserId = reviewer.Id,
                UserName = reviewer.FullName,
                Rating = 4,
                Title = "Great addition",
                Comment = "Consistently good quality and quick delivery. The colour is accurate to the photos.",
                IsApproved = true,
                IsVerifiedPurchase = true,
                CreatedAt = DateTime.UtcNow.AddDays(-(i * 5 + 3))
            });
            product.ReviewCount = 2;
            product.RatingAverage = reviews.Where(r => r.ProductId == product.Id).Average(r => r.Rating);
        }

        if (reviews.Count > 0)
        {
            await _database.GetCollection<ProductReview>("ProductReviews").InsertManyAsync(reviews, cancellationToken: ct);
            foreach (var product in products.Where(p => p.ReviewCount > 0))
            {
                await _database.GetCollection<Product>("Products").UpdateOneAsync(
                    Builders<Product>.Filter.Eq(p => p.Id, product.Id),
                    Builders<Product>.Update
                        .Set(p => p.ReviewCount, product.ReviewCount)
                        .Set(p => p.RatingAverage, product.RatingAverage), cancellationToken: ct);
            }
        }
    }

    private async Task SeedOrdersAsync(List<Product> products, Dictionary<string, User> users,
        List<ShippingMethod> shippingMethods, WebsiteSettings settings, CancellationToken ct)
    {
        var customer = users[AppRoles.Customer];
        var orders = new List<Order>();
        var payments = new List<Payment>();
        var statuses = new[] { OrderStatus.Completed, OrderStatus.Completed, OrderStatus.Shipped, OrderStatus.Processing, OrderStatus.Pending, OrderStatus.Cancelled };
        var shipping = shippingMethods[0];

        for (var i = 0; i < statuses.Length; i++)
        {
            var status = statuses[i];
            var items = new List<OrderItem>();
            var chosen = new[] { products[i * 2 % products.Count], products[(i * 2 + 3) % products.Count] };
            foreach (var product in chosen)
            {
                var quantity = 1 + (i % 2);
                items.Add(new OrderItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Sku = product.Sku,
                    ImageUrl = product.ThumbnailUrl,
                    UnitPrice = product.EffectivePrice,
                    Quantity = quantity,
                    LineTotal = Math.Round(product.EffectivePrice * quantity, 2)
                });
            }

            var subtotal = items.Sum(item => item.LineTotal);
            var discount = i == 1 ? Math.Round(subtotal * 0.1m, 2) : 0;
            var shippingCost = i == 3 ? 0 : shipping.Cost;
            var tax = Math.Round((subtotal - discount) * settings.TaxRate / 100m, 2);
            var total = Math.Round(subtotal - discount + shippingCost + tax, 2);
            var created = DateTime.UtcNow.AddDays(-(i * 4 + 1)).AddHours(-(i * 3));
            var paid = status is OrderStatus.Completed or OrderStatus.Shipped or OrderStatus.Processing;

            var order = new Order
            {
                OrderNumber = $"ORD-{created:yyyyMMdd}-{100200 + i}",
                UserId = customer.Id,
                CustomerName = customer.FullName,
                CustomerEmail = customer.Email,
                CustomerPhone = customer.Phone ?? "01700000000",
                Items = items,
                ShippingAddress = new AddressSnapshot
                {
                    FullName = customer.FullName,
                    Phone = customer.Phone ?? "01700000000",
                    Street = "House 12, Road 5, Mirpur",
                    City = "Dhaka",
                    State = "Dhaka",
                    PostalCode = "1216",
                    Country = "Bangladesh"
                },
                ShippingMethodName = shipping.Name,
                ShippingCost = shippingCost,
                CouponCode = i == 1 ? "WELCOME10" : null,
                Subtotal = subtotal,
                Discount = discount,
                TaxAmount = tax,
                Total = total,
                Status = status,
                PaymentMethod = PaymentProviders.Cod,
                PaymentStatus = paid ? PaymentStatus.Paid : PaymentStatus.Pending,
                PaymentTransactionId = paid ? $"SEED-TXN-{i:0000}" : null,
                InventoryCommitted = status != OrderStatus.Cancelled,
                StockRestored = status == OrderStatus.Cancelled,
                CreatedAt = created,
                ShippedAt = status is OrderStatus.Shipped or OrderStatus.Completed ? created.AddDays(1) : null,
                CompletedAt = status == OrderStatus.Completed ? created.AddDays(3) : null,
                CancelledAt = status == OrderStatus.Cancelled ? created.AddHours(5) : null,
                CancellationReason = status == OrderStatus.Cancelled ? "Customer changed their mind" : null,
                TrackingNumber = status is OrderStatus.Shipped or OrderStatus.Completed ? $"TRK{created:yyMMdd}{i:0000}" : null
            };
            order.StatusHistory.Add(new OrderStatusHistory { Status = OrderStatus.Pending, Note = "Order placed", ChangedAt = created });
            if (status is not (OrderStatus.Pending or OrderStatus.Cancelled))
                order.StatusHistory.Add(new OrderStatusHistory { Status = OrderStatus.Confirmed, Note = "Payment confirmed", ChangedAt = created.AddMinutes(12) });
            if (status is OrderStatus.Shipped or OrderStatus.Completed)
                order.StatusHistory.Add(new OrderStatusHistory { Status = OrderStatus.Shipped, Note = "Handed to carrier", ChangedAt = created.AddDays(1) });
            if (status == OrderStatus.Completed)
                order.StatusHistory.Add(new OrderStatusHistory { Status = OrderStatus.Completed, Note = "Delivered", ChangedAt = created.AddDays(3) });
            if (status == OrderStatus.Cancelled)
                order.StatusHistory.Add(new OrderStatusHistory { Status = OrderStatus.Cancelled, Note = "Customer changed their mind", ChangedAt = created.AddHours(5) });

            orders.Add(order);
            payments.Add(new Payment
            {
                OrderId = order.Id,
                OrderNumber = order.OrderNumber,
                UserId = customer.Id,
                Provider = PaymentProviders.Cod,
                Amount = total,
                Currency = settings.Currency,
                Status = paid ? PaymentStatus.Paid : PaymentStatus.Pending,
                TransactionId = order.PaymentTransactionId,
                CreatedAt = created
            });
        }

        await _database.GetCollection<Order>("Orders").InsertManyAsync(orders, cancellationToken: ct);
        await _database.GetCollection<Payment>("Payments").InsertManyAsync(payments, cancellationToken: ct);

        await _database.GetCollection<Notification>("Notifications").InsertManyAsync(new[]
        {
            new Notification
            {
                UserId = customer.Id.ToString(),
                Title = "Welcome to Safwan",
                Message = "Thanks for joining us. Use WELCOME10 for 10% off your first order.",
                Type = "Promotion",
                Link = "/products"
            },
            new Notification
            {
                UserId = customer.Id.ToString(),
                Title = "Order delivered",
                Message = $"Order {orders[0].OrderNumber} has been delivered. We would love your review.",
                Type = "Order",
                Link = $"/account/orders/{orders[0].Id}"
            }
        }, cancellationToken: ct);

        await _database.GetCollection<Address>("Addresses").InsertOneAsync(new Address
        {
            UserId = customer.Id.ToString(),
            FullName = customer.FullName,
            Phone = customer.Phone ?? "01700000000",
            Street = "House 12, Road 5, Mirpur",
            City = "Dhaka",
            State = "Dhaka",
            PostalCode = "1216",
            Country = "Bangladesh",
            IsDefault = true
        }, cancellationToken: ct);
    }

    private static string Img(string id) => $"https://images.unsplash.com/photo-{id}{ImageParams[0]}";

    private static List<ProductVariant> Variants(string colorA, string colorB, string[] sizes, int stockPerVariant)
    {
        var variants = new List<ProductVariant>();
        foreach (var color in new[] { colorA, colorB })
        {
            foreach (var size in sizes)
            {
                variants.Add(new ProductVariant
                {
                    Name = $"{color} / {size}",
                    Sku = $"VAR-{color[..Math.Min(3, color.Length)].ToUpperInvariant()}-{size}",
                    Price = 0,
                    Stock = stockPerVariant,
                    Attributes = new Dictionary<string, string> { ["Color"] = color, ["Size"] = size }
                });
            }
        }
        return variants;
    }

    private record ProductSeed(string Name, string Sku, string CategoryKey, string BrandKey, decimal Price,
        decimal? DiscountPrice, string Description, string Color, int Stock, bool Featured, int Sold, double Rating,
        string[] Images, string[] Tags, Dictionary<string, string> Specifications,
        List<ProductVariant>? Variants = null);
}

public class SeedOptions
{
    public const string SectionName = "Seed";
    public bool Enabled { get; set; } = true;
}
