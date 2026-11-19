using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace ECommerce.Shared.Common;

public static class StringExtensions
{
    public static string ToSlug(this string value)
    {
        var slug = value.Trim().ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("n")[..10] : slug;
    }

    public static string ToSha256(this string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static string ToBase64Url(this string value) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(value))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    public static string FromBase64Url(this string value)
    {
        var s = value.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4)
        {
            case 2: s += "=="; break;
            case 3: s += "="; break;
        }
        return Encoding.UTF8.GetString(Convert.FromBase64String(s));
    }

    public static string RandomToken(int bytes = 32) =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
}
