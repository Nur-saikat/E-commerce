namespace ECommerce.Application.DTOs;

public class VoucherWalletDto
{
    public int Balance { get; set; }
    public int LifetimeEarned { get; set; }
    public int LifetimeRedeemed { get; set; }
    public decimal PointValue { get; set; } = 1;
    public decimal EarnPercent { get; set; }
    public bool Enabled { get; set; }
    public List<VoucherTransactionDto> Transactions { get; set; } = new();
}

public class VoucherTransactionDto
{
    public string Id { get; set; } = string.Empty;
    public int Points { get; set; }
    public int BalanceAfter { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}
