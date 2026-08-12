export interface NavItem {
  id: string;
  label: {
    ar: string;
    en: string;
  };
  href: string;
  children?: NavItem[];
  icon?: string;
  badge?: string;
  badgeColor?: string;
}

export interface Navigation {
  main: NavItem[];
  footer: {
    company: NavItem[];
    customerService: NavItem[];
    categories: NavItem[];
    brands: NavItem[];
    social: NavItem[];
  };
  mobile: NavItem[];
}