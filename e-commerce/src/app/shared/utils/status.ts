export function orderStatusClass(status: string): string {
  switch (status) {
    case 'Pending':
      return 'badge-warning';
    case 'Confirmed':
      return 'badge-gold';
    case 'Processing':
      return 'badge-gold';
    case 'Shipped':
      return 'bg-sky-50 text-sky-700 badge';
    case 'Completed':
      return 'badge-success';
    case 'Cancelled':
    case 'Refunded':
      return 'badge-danger';
    default:
      return 'badge-muted';
  }
}

export function paymentStatusClass(status: string): string {
  switch (status) {
    case 'Paid':
      return 'badge-success';
    case 'Pending':
      return 'badge-warning';
    case 'Failed':
    case 'Refunded':
      return 'badge-danger';
    default:
      return 'badge-muted';
  }
}

export function inventoryStatusClass(status: string): string {
  switch (status) {
    case 'In Stock':
      return 'badge-success';
    case 'Low Stock':
      return 'badge-warning';
    case 'Out of Stock':
      return 'badge-danger';
    default:
      return 'badge-muted';
  }
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'COD':
      return 'Cash on Delivery';
    case 'Stripe':
      return 'Card via Stripe';
    case 'SSLCommerz':
      return 'SSLCommerz';
    case 'bKash':
      return 'bKash';
    case 'Nagad':
      return 'Nagad';
    case 'Rocket':
      return 'Rocket';
    case 'Voucher':
      return 'Voucher points';
    default:
      return method;
  }
}

export function returnStatusClass(status: string): string {
  switch (status) {
    case 'Requested':
      return 'badge-warning';
    case 'Approved':
      return 'badge-gold';
    case 'Received':
      return 'bg-sky-50 text-sky-700 badge';
    case 'Refunded':
      return 'badge-success';
    case 'Rejected':
      return 'badge-danger';
    default:
      return 'badge-muted';
  }
}

export function refundDestinationLabel(destination: string): string {
  switch (destination) {
    case 'Original':
      return 'Original payment method';
    case 'BankTransfer':
      return 'Bank transfer';
    case 'Voucher':
      return 'Voucher points';
    default:
      return destination;
  }
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
