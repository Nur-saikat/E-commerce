namespace ECommerce.Shared.Constants;

public static class AppRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Staff = "Staff";
    public const string Customer = "Customer";

    public static readonly string[] AdminRoles = { SuperAdmin, Admin, Manager, Staff };
}

public static class Permissions
{
    public const string ProductsView = "products.view";
    public const string ProductsManage = "products.manage";
    public const string CategoriesManage = "categories.manage";
    public const string BrandsManage = "brands.manage";
    public const string OrdersView = "orders.view";
    public const string OrdersManage = "orders.manage";
    public const string CustomersView = "customers.view";
    public const string CustomersManage = "customers.manage";
    public const string InventoryManage = "inventory.manage";
    public const string CouponsManage = "coupons.manage";
    public const string ReviewsManage = "reviews.manage";
    public const string ContentManage = "content.manage";
    public const string SettingsManage = "settings.manage";
    public const string DashboardView = "dashboard.view";
    public const string ReportsView = "reports.view";

    public static readonly string[] All =
    {
        ProductsView, ProductsManage, CategoriesManage, BrandsManage, OrdersView, OrdersManage,
        CustomersView, CustomersManage, InventoryManage, CouponsManage, ReviewsManage,
        ContentManage, SettingsManage, DashboardView, ReportsView
    };

    public static readonly Dictionary<string, string[]> RoleDefaults = new()
    {
        [AppRoles.SuperAdmin] = All,
        [AppRoles.Admin] = All,
        [AppRoles.Manager] = new[]
        {
            ProductsView, ProductsManage, CategoriesManage, BrandsManage, OrdersView, OrdersManage,
            CustomersView, InventoryManage, CouponsManage, ReviewsManage, ContentManage,
            DashboardView, ReportsView
        },
        [AppRoles.Staff] = new[]
        {
            ProductsView, OrdersView, OrdersManage, InventoryManage, ReviewsManage, DashboardView
        },
        [AppRoles.Customer] = Array.Empty<string>()
    };
}

public static class OrderStatus
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Processing = "Processing";
    public const string Shipped = "Shipped";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
    public const string Refunded = "Refunded";

    public static readonly string[] All = { Pending, Confirmed, Processing, Shipped, Completed, Cancelled, Refunded };

    public static readonly Dictionary<string, string[]> AllowedTransitions = new()
    {
        [Pending] = new[] { Confirmed, Cancelled },
        [Confirmed] = new[] { Processing, Cancelled },
        [Processing] = new[] { Shipped, Cancelled },
        [Shipped] = new[] { Completed },
        [Completed] = new[] { Refunded },
        [Cancelled] = Array.Empty<string>(),
        [Refunded] = Array.Empty<string>()
    };
}

public static class PaymentStatus
{
    public const string Pending = "Pending";
    public const string Paid = "Paid";
    public const string Failed = "Failed";
    public const string Refunded = "Refunded";
}

public static class PaymentProviders
{
    public const string Cod = "COD";
    public const string Stripe = "Stripe";
    public const string SslCommerz = "SSLCommerz";
}
