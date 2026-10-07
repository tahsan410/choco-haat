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
  // Add more methods here later (e.g. bKash, Nagad, card). `enabled` controls checkout visibility.
  { id: 'COD', label: 'Cash on Delivery', description: 'Pay when your order arrives.', enabled: true },
];

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
];
