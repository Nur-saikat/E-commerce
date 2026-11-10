using ECommerce.Domain.Common;

namespace ECommerce.Domain.Entities;

public class VoucherWallet : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public int Balance { get; set; }
    public int LifetimeEarned { get; set; }
    public int LifetimeRedeemed { get; set; }
}

public class VoucherTransaction : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public int Points { get; set; }
    public int BalanceAfter { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public string? Note { get; set; }
}
