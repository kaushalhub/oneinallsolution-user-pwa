import { apiRequest } from './api';

export type CatalogService = {
  name: string;
  slug: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  category: string;
  catClass: string;
  price: string;
  priceAmount: number;
  gstPercent?: number;
  baseAmount?: number;
  gstAmount?: number;
  totalAmount?: number;
  mrp?: string | null;
  mrpAmount?: number | null;
  duration: string;
  durationMins: number;
  status: string;
  iconUrl?: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  description: string;
};

export type CatalogCategory = {
  key: string;
  label: string;
  icon: string;
  iconUrl?: string | null;
  iconBg: string;
  iconColor: string;
  sortOrder: number;
};

export type CatalogBanner = {
  id: string;
  title: string;
  targetUrl: string;
  imageUrl: string;
  tint: string;
  priority: string;
};

export type ServiceDetail = {
  slug: string;
  title: string;
  navTitle: string;
  description: string;
  price: number;
  priceFormatted: string;
  gstPercent?: number;
  baseAmount?: number;
  gstAmount?: number;
  totalAmount?: number;
  baseFormatted?: string;
  gstFormatted?: string;
  totalFormatted?: string;
  mrpAmount?: number | null;
  mrpFormatted?: string | null;
  durationMins: number;
  durationLabel: string;
  scopeItems: string[];
  addons: { id: string; name: string; price: string }[];
  imageUrls: string[];
  iconUrl?: string | null;
  icon: string;
  iconBg: string;
  iconColor: string;
  category: string;
};

export type IndianStateOption = { code: string; label: string };
export type CatalogCityOption = { slug: string; label: string };

export async function fetchIndianStates() {
  return apiRequest<{ states: IndianStateOption[] }>('/catalog/states');
}

export async function fetchCatalogCities(stateCode: string) {
  return apiRequest<{ state: string; cities: CatalogCityOption[] }>('/catalog/cities', {
    query: { state: stateCode },
  });
}

function servicesCatalogQuery(opts?: { state?: string; city?: string }) {
  if (!opts?.state) return undefined;
  return {
    state: opts.state,
    ...(opts.city ? { city: opts.city } : {}),
  };
}

function categoriesCatalogQuery(opts?: { state?: string; city?: string }) {
  if (!opts?.state) return undefined;
  return {
    state: opts.state,
    ...(opts.city ? { city: opts.city } : {}),
  };
}

export async function fetchCatalogCategories(opts?: { state?: string; city?: string }) {
  return apiRequest<{ categories: CatalogCategory[] }>('/catalog/categories', {
    query: categoriesCatalogQuery(opts),
  });
}

export async function fetchCatalogServices(opts?: { state?: string; city?: string }) {
  return apiRequest<{ services: CatalogService[] }>('/catalog/services', {
    query: servicesCatalogQuery(opts),
  });
}

export async function fetchCatalogBanners() {
  return apiRequest<{ banners: CatalogBanner[] }>('/catalog/banners');
}

export async function fetchServiceDetail(slug: string, opts?: { state?: string; city?: string }) {
  return apiRequest<ServiceDetail>(`/catalog/services/${encodeURIComponent(slug)}`, {
    query: servicesCatalogQuery(opts),
  });
}
