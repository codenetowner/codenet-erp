namespace Catalyst.API.Helpers;

/// <summary>
/// Helper class for consistent decimal precision across the system
/// Backend/DB: 5 decimal places for accuracy
/// Frontend: 3 decimal places for display (handled on frontend side)
/// </summary>
public static class PrecisionHelper
{
    public const int StoragePrecision = 5;
    public const int DisplayPrecision = 3;

    /// <summary>
    /// Round a decimal value to 5 decimal places for storage
    /// </summary>
    public static decimal RoundForStorage(decimal value)
    {
        return Math.Round(value, StoragePrecision, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// Round a decimal value to 3 decimal places for display
    /// </summary>
    public static decimal RoundForDisplay(decimal value)
    {
        return Math.Round(value, DisplayPrecision, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// Calculate piece price from box price with 5 decimal precision
    /// </summary>
    public static decimal CalculatePiecePrice(decimal boxPrice, int unitsPerBox)
    {
        if (unitsPerBox <= 0) return boxPrice;
        return RoundForStorage(boxPrice / unitsPerBox);
    }

    /// <summary>
    /// Calculate box price from piece price with 5 decimal precision
    /// </summary>
    public static decimal CalculateBoxPrice(decimal piecePrice, int unitsPerBox)
    {
        if (unitsPerBox <= 0) return piecePrice;
        return RoundForStorage(piecePrice * unitsPerBox);
    }

    /// <summary>
    /// Calculate line total with proper precision
    /// </summary>
    public static decimal CalculateLineTotal(decimal quantity, decimal unitPrice, decimal discount = 0)
    {
        var total = (quantity * unitPrice) - discount;
        return RoundForStorage(total);
    }

    /// <summary>
    /// Calculate discount amount with proper precision
    /// </summary>
    public static decimal CalculateDiscount(decimal amount, decimal discountPercent)
    {
        return RoundForStorage(amount * (discountPercent / 100));
    }
}
