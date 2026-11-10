using ECommerce.Application.DTOs;
using ECommerce.Domain.Entities;
using FluentValidation;

namespace ECommerce.Application.Validators;

public class StaffRequestValidator : AbstractValidator<StaffRequest>
{
    public StaffRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Phone).MaximumLength(30);
        RuleFor(x => x.Designation).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Department).NotEmpty().MaximumLength(120);
        RuleFor(x => x.EmployeeCode).MaximumLength(40);
        RuleFor(x => x.EmploymentType).Must(t => BusinessConstants.EmploymentTypes.Contains(t))
            .WithMessage("Invalid employment type");
        RuleFor(x => x.Status).Must(s => BusinessConstants.StaffStatuses.Contains(s))
            .WithMessage("Invalid staff status");
        RuleFor(x => x.Salary).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Address).MaximumLength(300);
        RuleFor(x => x.Notes).MaximumLength(2000);
        RuleForEach(x => x.Documents).ChildRules(d =>
        {
            d.RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
            d.RuleFor(x => x.Url).NotEmpty().MaximumLength(500);
            d.RuleFor(x => x.Category).Must(c => BusinessConstants.DocumentCategories.Contains(c))
                .WithMessage("Invalid document category");
        });
    }
}

public class OwnerProfileRequestValidator : AbstractValidator<OwnerProfileRequest>
{
    public OwnerProfileRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.BusinessName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Designation).MaximumLength(120);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Phone).MaximumLength(30);
        RuleFor(x => x.Address).MaximumLength(300);
        RuleFor(x => x.NationalId).MaximumLength(60);
        RuleFor(x => x.TinNumber).MaximumLength(60);
        RuleFor(x => x.BinNumber).MaximumLength(60);
        RuleFor(x => x.Bio).MaximumLength(2000);
        RuleForEach(x => x.EmploymentHistory).ChildRules(h =>
        {
            h.RuleFor(x => x.Company).NotEmpty().MaximumLength(150);
            h.RuleFor(x => x.Role).NotEmpty().MaximumLength(120);
            h.RuleFor(x => x.Description).MaximumLength(1000);
        });
        RuleForEach(x => x.Documents).ChildRules(d =>
        {
            d.RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
            d.RuleFor(x => x.Url).NotEmpty().MaximumLength(500);
            d.RuleFor(x => x.Category).Must(c => BusinessConstants.DocumentCategories.Contains(c))
                .WithMessage("Invalid document category");
        });
    }
}

public class CapitalEntryRequestValidator : AbstractValidator<CapitalEntryRequest>
{
    public CapitalEntryRequestValidator()
    {
        RuleFor(x => x.Type).Must(t => BusinessConstants.CapitalTypes.Contains(t))
            .WithMessage("Invalid capital entry type");
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Source).NotEmpty().MaximumLength(120);
        RuleFor(x => x.PaymentMethod).MaximumLength(60);
        RuleFor(x => x.Reference).MaximumLength(120);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public class ExpenseEntryRequestValidator : AbstractValidator<ExpenseEntryRequest>
{
    public ExpenseEntryRequestValidator()
    {
        RuleFor(x => x.Category).Must(c => BusinessConstants.ExpenseCategories.Contains(c))
            .WithMessage("Invalid expense category");
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Vendor).MaximumLength(150);
        RuleFor(x => x.PaymentMethod).MaximumLength(60);
        RuleFor(x => x.Reference).MaximumLength(120);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public class StockArrivalRequestValidator : AbstractValidator<StockArrivalRequest>
{
    public StockArrivalRequestValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.UnitCost).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Supplier).MaximumLength(150);
        RuleFor(x => x.Reference).MaximumLength(120);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public class SupplierReturnRequestValidator : AbstractValidator<SupplierReturnRequest>
{
    public SupplierReturnRequestValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.UnitCost).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Supplier).MaximumLength(150);
        RuleFor(x => x.Reference).MaximumLength(120);
        RuleFor(x => x.Reason).MaximumLength(200);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public class StockPurchaseRequestValidator : AbstractValidator<StockPurchaseRequest>
{
    public StockPurchaseRequestValidator()
    {
        RuleFor(x => x.Supplier).MaximumLength(150);
        RuleFor(x => x.Reference).MaximumLength(120);
        RuleFor(x => x.Note).MaximumLength(1000);
        RuleFor(x => x.Items).NotEmpty().WithMessage("Add at least one product to the purchase");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(x => x.ProductId).NotEmpty();
            item.RuleFor(x => x.Quantity).GreaterThan(0);
            item.RuleFor(x => x.UnitCost).GreaterThanOrEqualTo(0);
        });
    }
}
