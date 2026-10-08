// Shared constants – imported by the React app AND by Netlify Functions.
// Keep this file free of browser/Node-specific APIs.

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// Statuses that count as real revenue (cancelled orders never do).
export const REVENUE_EXCLUDED_STATUSES = ['Cancelled'];

// "Timeline" steps shown on the Track Order page (Cancelled is handled separately).
export const TIMELINE_STEPS = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
export const TIMELINE_LABELS = {
  Pending: 'Order Placed',
  Confirmed: 'Confirmed',
  Processing: 'Processing',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
};

export const PAYMENT_METHODS = [
  // `enabled` controls checkout visibility. COD stays defined (disabled) so older orders still display.
  { id: 'BKASH', label: 'bKash', description: 'Send Money to our bKash number, then enter the Transaction ID.', enabled: true, mobile: true, settingKey: 'bkash_number', color: '#E2136E' },
  { id: 'NAGAD', label: 'Nagad', description: 'Send Money to our Nagad number, then enter the Transaction ID.', enabled: true, mobile: true, settingKey: 'nagad_number', color: '#F6921E' },
  // Cash on Delivery: product price in cash at the door, but the delivery fee is paid in advance via bKash/Nagad.
  // The checkout shows ONE "Cash on Delivery" choice; the order is stored as COD_BKASH / COD_NAGAD (advance method),
  // or plain COD when delivery is free (nothing to pay in advance).
  { id: 'COD', label: 'Cash on Delivery', description: 'Pay for the chocolates in cash when they arrive. Delivery fee is paid in advance by bKash or Nagad.', enabled: true, cod: true },
  { id: 'COD_BKASH', label: 'Cash on Delivery (delivery fee via bKash)', enabled: true, mobile: true, cod: true, advance: 'BKASH', hidden: true, settingKey: 'bkash_number', color: '#E2136E' },
  { id: 'COD_NAGAD', label: 'Cash on Delivery (delivery fee via Nagad)', enabled: true, mobile: true, cod: true, advance: 'NAGAD', hidden: true, settingKey: 'nagad_number', color: '#F6921E' },
];

export const paymentLabel = (id) => (PAYMENT_METHODS.find((m) => m.id === id)?.label) || id || '';
export const isCodMethod = (id) => String(id || '').startsWith('COD');

export const LIMITS = {
  maxLines: 30,
  maxQtyPerLine: 50,
  name: 80,
  email: 120,
  address: 300,
  upazila: 80,
  note: 300,
  coupon: 32,
};

export const DEFAULT_SETTINGS = {
  store_name: 'Choco Haat',
  tagline: 'Premium chocolates. Better prices.',
  contact_phone: '01700-000000',
  contact_email: 'hello@example.com',
  whatsapp_number: '',
  bkash_number: '', // personal/merchant bKash number customers send money to
  nagad_number: '',
  address_line: 'Bangladesh',
  // Delivery – editable in Admin → Settings. Nothing is hard-coded elsewhere.
  inside_city_district: 'Sylhet',
  inside_city_charge: 60,
  outside_city_charge: 100,
  free_delivery_threshold: 0, // 0 = disabled
  min_order_amount: 0, // 0 = disabled
  low_stock_threshold: 5,
};

// Bangladesh administrative divisions → districts (64). Upazila / area is free-text on purpose.
export const BD_LOCATIONS = {
  Barishal: ['Barguna', 'Barishal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
  Chattogram: [
    'Bandarban', 'Brahmanbaria', 'Chandpur', 'Chattogram', "Cox's Bazar", 'Cumilla',
    'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati',
  ],
  Dhaka: [
    'Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj',
    'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail',
  ],
  Khulna: ['Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  Mymensingh: ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
  Rajshahi: ['Bogura', 'Chapainawabganj', 'Joypurhat', 'Naogaon', 'Natore', 'Pabna', 'Rajshahi', 'Sirajganj'],
  Rangpur: ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  Sylhet: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
};

export const SHEET_HEADERS = [
  'Order ID',
  'Date',
  'Customer Name',
  'Phone',
  'Email',
  'Address',
  'Products',
  'Quantities',
  'Subtotal',
  'Delivery Charge',
  'Total',
  'Payment Method',
  'Order Status',
  'Paid From',
  'Transaction ID',
];
