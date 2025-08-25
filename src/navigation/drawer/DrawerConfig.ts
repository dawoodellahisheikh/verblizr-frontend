// src/navigation/drawer/DrawerConfig.ts


// src/navigation/drawer/drawerItems.ts
import HomeIcon from '../../assets/icons/home1.svg'
// import MicIcon from '../../assets/icons/conversation.svg'
import BillingIcon from '../../assets/icons/billing1.svg'
import SupportIcon from '../../assets/icons/support1.svg'
import MultiCards from '../../assets/icons/wallet.svg'
// import LogOut from '../../assets/icons/logout1.svg'
import DashBoardIcon from '../../assets/icons/dashboard1.svg'
import MicIcon from '../../assets/icons/mic.svg'
import SignOut from '../../assets/icons/logout1.svg';
import ProfileIcon from '../../assets/icons/profile.svg'; // DES Added: Import profile icon
import InvoicesIcon from '../../assets/icons/briefcase.svg' 

// types.ts (or wherever your Drawer types are)
import * as React from 'react';
import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';


export type DrawerAction =
  | { type: 'navigate'; routeName: string; params?: Record<string, unknown> }
  | { type: 'link'; url: string }
  | { type: 'event'; key: 'toggleTheme' | 'signOut' | string }
  | { type: 'divider' };


  // Option A: inline SVG React component (what you're using now)
type SvgIcon = ComponentType<SvgProps>;

// Option B (optional): vector-icons descriptor if you still need it elsewhere
type VectorIcon = { lib: 'Ionicons' | 'Feather' | 'MaterialIcons'; name: string };

export type DrawerItem = {
  id: string;
  label?: string;
  // allow either an svg component OR a vector-icons descriptor
  icon?: SvgIcon | VectorIcon;
  action: DrawerAction;
  visible?: boolean;
};

export const drawerItems: DrawerItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: HomeIcon,
    action: { type: 'navigate', routeName: 'Home' },
  },
  // DES Added: Edit Profile option - temporarily disabled for debugging
  {
    id: 'profile',
    label: 'Edit Profile',
    icon: ProfileIcon,
    action: { type: 'navigate', routeName: 'EditProfile' },
    visible: true, // DES Added: Temporarily hide to debug
  },{
  id: 'dashboard',
  label: 'Dashboard + Recording',
  icon: DashBoardIcon,
  action: { type: 'navigate', routeName: 'Dashboard' }, // <-- was 'DashboardScreen'
  },
  {
    id: 'languages',
    label: 'Start Conversation',
    icon: MicIcon,
    action: { type: 'navigate', routeName: 'LanguagePair' },
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: BillingIcon,
    action: { type: 'navigate', routeName: 'Billing' },
  },
  {
    id: 'invoices',
    label: 'Payment History & Invoices',
    icon: InvoicesIcon, // use this if you have an invoice icon
    action: { type: 'navigate', routeName: 'PaymentHistory' }, // <-- must match your RootNavigator screen name
  },
  {
    id: 'paymentmethod',
    label: 'Saved Cards',
    icon: MultiCards,
    action: { type: 'navigate', routeName: 'PaymentMethods' },
  },
  
  { id: 'sep1', action: { type: 'divider' } },
  {
    id: 'help',
    label: 'Help & Docs',
    icon: SupportIcon,
    action: { type: 'link', url: 'https://verblizr.com/docs' },
  },

  {
    id: 'signout',
    label: 'Logout',
    icon: SignOut,
    action: { type: 'event', key: 'signOut' },
  },
];