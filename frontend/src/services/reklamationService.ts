import { apiFetch, API_URL } from "./apiClient";
import type { Customer, Product, Farmer } from "../types";

export async function loadReklCustomers(): Promise<Customer[]> {
  try {
    const data = await apiFetch<Customer[]>(`/customers`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Fehler beim Laden der Reklamations-Kunden:", err);
    return [];
  }
}

export async function loadReklProducts(customerId: number): Promise<Product[]> {
  try {
    const data = await apiFetch<Product[]>(`/customers/${customerId}/products`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Fehler beim Laden der Reklamations-Produkte:", err);
    return [];
  }
}

export async function loadReklSales(customerId: number, productId: number): Promise<any[]> {
  try {
    const data = await apiFetch<any[]>(`/customers/${customerId}/products/${productId}/sales`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Fehler beim Laden der Reklamations-Verkäufe:", err);
    return [];
  }
}

export async function loadReklRelevantFarmers(saleId: number): Promise<Farmer[]> {
  try {
    const data = await apiFetch<Farmer[]>(`/sales/${saleId}/relevant-farmers`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Fehler beim Laden der relevanten Bauern:", err);
    return [];
  }
}

