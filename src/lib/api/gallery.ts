import { apiRequest } from "./client";
import type { GalleryAlbum, GalleryItem, Locale } from "./types";

export type GalleryAlbumInput = Pick<GalleryAlbum, "slug" | "title_en" | "title_fr" | "description_en" | "description_fr" | "cover_image_url" | "sort_order">;
export type GalleryItemInput = Pick<GalleryItem, "kind" | "source_url" | "thumbnail_url" | "caption_en" | "caption_fr" | "alt_en" | "alt_fr" | "sort_order">;

export const listStaffAlbums = (token: string, locale: Locale) =>
  apiRequest<GalleryAlbum[]>("/cms/gallery", { token, locale, cache: "no-store" });

export const saveAlbum = (payload: GalleryAlbumInput, token: string, locale: Locale, id?: string) =>
  apiRequest<GalleryAlbum>(id ? `/cms/gallery/${id}` : "/cms/gallery", {
    method: id ? "PUT" : "POST", body: payload, token, locale, cache: "no-store",
  });

export const setAlbumPublished = (id: string, publish: boolean, token: string, locale: Locale) =>
  apiRequest<GalleryAlbum>(`/cms/gallery/${id}/${publish ? "publish" : "unpublish"}`, {
    method: "POST", token, locale, cache: "no-store",
  });

export const listStaffItems = (albumId: string, token: string, locale: Locale) =>
  apiRequest<GalleryItem[]>(`/cms/gallery/${albumId}/items`, { token, locale, cache: "no-store" });

export const saveItem = (albumId: string, payload: GalleryItemInput, token: string, locale: Locale, itemId?: string) =>
  apiRequest<GalleryItem>(itemId ? `/cms/gallery/items/${itemId}` : `/cms/gallery/${albumId}/items`, {
    method: itemId ? "PUT" : "POST", body: payload, token, locale, cache: "no-store",
  });

export const setItemPublished = (id: string, publish: boolean, token: string, locale: Locale) =>
  apiRequest<GalleryItem>(`/cms/gallery/items/${id}/${publish ? "publish" : "unpublish"}`, {
    method: "POST", token, locale, cache: "no-store",
  });
