
namespace ECommerce.Shared.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<string> Errors { get; set; } = new();
    public PaginationMeta? Pagination { get; set; }

    public static ApiResponse<T> Ok(T? data, string message = "Request completed successfully") =>
        new() { Success = true, Message = message, Data = data };

    public static ApiResponse<T> Fail(string message, List<string>? errors = null) =>
        new() { Success = false, Message = message, Errors = errors ?? new List<string>() };
}

public class ApiResponse : ApiResponse<object>
{
    public static ApiResponse Ok(string message = "Request completed successfully") =>
        new() { Success = true, Message = message };
}

public class PaginationMeta
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public long TotalItems { get; set; }
    public int TotalPages { get; set; }
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public long TotalItems { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalItems / (double)PageSize);

    public PagedResult() { }

    public PagedResult(List<T> items, long totalItems, int page, int pageSize)
    {
        Items = items;
        TotalItems = totalItems;
        Page = page;
        PageSize = pageSize;
    }

    public PaginationMeta ToMeta() => new()
    {
        Page = Page < 1 ? 1 : Page,
        PageSize = PageSize,
        TotalItems = TotalItems,
        TotalPages = TotalPages
    };
}

public class PagedQuery
{
    private int _page = 1;
    private int _pageSize = 12;

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = Math.Clamp(value, 1, 100);
    }

    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public bool Descending { get; set; } = true;
}

public static class JsonDefaults
{
}
