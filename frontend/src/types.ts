export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED_QUEUED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

export type PickupCounter = 'Counter 1 (Hot Kadai)' | 'Counter 2 (Beverages & Combos)';

export interface CustomizationOption {
  spiceLevel?: 'Mild' | 'Medium' | 'Spicy';
  chutney?: 'Mint Coriander' | 'Sweet Tamarind' | 'Extra Fried Chili' | 'Both Chutneys';
  beverageOption?: 'Extra Strong' | 'Less Sugar' | 'No Sugar' | 'Kulhad Upgrade';
  notes?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  hindiName?: string;
  category: 'Hot Kadai' | 'Tiffin & Griddle' | 'Chai & Coolers' | 'Combos';
  price: number; // in INR
  prepTimeMinutes: number;
  availableStock: number;
  isPopular?: boolean;
  isSoldOut?: boolean;
  image: string;
  cloudinaryPublicId?: string;
  description: string;
  servingCounter: PickupCounter;
  dietary: 'Veg' | 'Vegan' | 'Jain Friendly';
}

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  customization?: CustomizationOption;
}

export interface BreakSlot {
  id: string;
  label: string;
  timeRange: string;
  startTime: string; // e.g. "10:45"
  endTime: string;   // e.g. "11:00"
  status: 'upcoming' | 'active' | 'completed';
  ordersCapacity: number;
  currentBooked: number;
}

export interface QueueToken {
  id: string;
  tokenNumber: string; // e.g. "S-104"
  sequenceNumber: number;
  orderId: string;
  studentName: string;
  studentRoll: string;
  counter: PickupCounter;
  status: OrderStatus;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    customization?: CustomizationOption;
  }[];
  totalAmount: number;
  slotId: string;
  slotLabel: string;
  createdAt: string;
  estimatedPickupTime: string;
  preparedAt?: string;
  readyAt?: string;
  completedAt?: string;
  paymentId: string;
  paymentMethod: 'stripe_card' | 'stripe_upi' | 'campus_wallet';
}

export interface PaymentTransaction {
  transactionId: string;
  orderId: string;
  tokenNumber: string;
  amount: number;
  currency: 'INR' | 'USD';
  status: 'succeeded' | 'refunded' | 'pending';
  paymentMethod: 'stripe_card' | 'stripe_upi' | 'campus_wallet';
  stripePaymentIntentId: string;
  last4?: string;
  cardBrand?: string;
  timestamp: string;
  studentRoll: string;
}

export interface KitchenBatchDemand {
  menuItemId: string;
  name: string;
  category: string;
  totalQuantity: number;
  tokensWaiting: string[];
  counter: PickupCounter;
}

export interface CanteenMetrics {
  totalOrdersToday: number;
  totalRevenue: number;
  averagePrepTimeMinutes: number;
  activeQueueCount: number;
  servedTokensCount: number;
  rushClearanceRate: number; // percentage
  rushModeActive: boolean;
}

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  phone?: string;
  role: 'student' | 'vendor_admin';
}

