// Central site data: nav, contact details, org facts.
// Mirrors the real Annie's Havens content (not the design mockup placeholders).

export const site = {
  name: "Annie's Havens",
  tagline: 'Ontario Foster Care',
  url: 'https://www.annieshavens.ca',
  phone: '(905) 294-2137',
  phoneHref: 'tel:+19052942137',
  newHomesExt: 'ext. 5',
  newHomesEmail: 'recruitment@annieshavens.ca',
  address: {
    street: '517 Upper Sherman Ave.',
    city: 'Hamilton',
    region: 'Ontario',
    postal: 'L8V 3L7',
  },
  founded: 2004, // Annie's Havens (the agency) was founded in 2004
  fosteringSince: 1991, // the Wilsons have been foster parents since 1991
  // (they started their first agency, Openarms Family Homes in Ottawa, in 1996)
  sisterAgency: { name: 'Safe Harbours Family Treatment Homes', url: 'https://safeharbours.ca' },
} as const;

export type NavItem = {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
};

export const nav: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Foster Parenting',
    children: [
      { label: 'Foster Care in Ontario', href: '/foster-care-in-ontario' },
      { label: 'What Is Foster Parenting?', href: '/what-is-foster-parenting' },
      { label: 'Frequently Asked Questions', href: '/faq' },
      { label: 'Children In Care', href: '/children-in-care' },
      { label: 'Foster Parent Application Process', href: '/foster-parent-application-process' },
      { label: 'Foster Home Quiz', href: '/foster-home-quiz' },
    ],
  },
  {
    label: 'Foster Care Programs',
    href: '/care-programs',
    children: [
      { label: 'Mainstream', href: '/care-programs#mainstream' },
      { label: 'Special Needs', href: '/care-programs#special-needs' },
      { label: 'Trauma-Focused Care', href: '/care-programs#trauma-focused' },
    ],
  },
  { label: 'About Us', href: '/about-us' },
  { label: 'Contact', href: '/contact-us' },
  {
    label: 'More',
    children: [
      { label: 'News', href: '/news' },
      { label: 'Program Description', href: '/program-description' },
      { label: 'Affiliations and Memberships', href: '/affiliations' },
      { label: 'Land Acknowledgement', href: '/land-acknowledgement' },
      { label: 'Complaints', href: '/complaints' },
      { label: 'Referral Sources', href: '/referral-sources' },
    ],
  },
];
