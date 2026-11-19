using ECommerce.Application.DTOs;
using FluentValidation;

namespace ECommerce.Application.Validators;

public class MobilePaymentSubmitRequestValidator : AbstractValidator<MobilePaymentSubmitRequest>
{
    public MobilePaymentSubmitRequestValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty();
        RuleFor(x => x.Provider).NotEmpty();
        RuleFor(x => x.SenderNumber).NotEmpty().MaximumLength(20);
        RuleFor(x => x.TransactionId).NotEmpty().MaximumLength(40);
        RuleFor(x => x.GuestEmail).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.GuestEmail));
    }
}

public class CreateReturnRequestValidator : AbstractValidator<CreateReturnRequest>
{
    public CreateReturnRequestValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty();
        RuleFor(x => x.Items).NotEmpty().WithMessage("Select at least one item to return");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty();
            item.RuleFor(i => i.Quantity).GreaterThan(0);
        });
        RuleFor(x => x.Reason).NotEmpty().MinimumLength(3).MaximumLength(300);
        RuleFor(x => x.Comment).MaximumLength(1000);
        RuleFor(x => x.RefundPreference).NotEmpty().MaximumLength(40);
        RuleFor(x => x.AccountName).MaximumLength(120);
        RuleFor(x => x.AccountNumber).MaximumLength(60);
        RuleFor(x => x.BankName).MaximumLength(120);
    }
}

public class UpdateReturnStatusRequestValidator : AbstractValidator<UpdateReturnStatusRequest>
{
    public UpdateReturnStatusRequestValidator()
    {
        RuleFor(x => x.Status).NotEmpty();
        RuleFor(x => x.AdminNote).MaximumLength(1000);
        RuleFor(x => x.Reference).MaximumLength(120);
        RuleFor(x => x.AccountName).MaximumLength(120);
        RuleFor(x => x.AccountNumber).MaximumLength(60);
        RuleFor(x => x.BankName).MaximumLength(120);
    }
}
