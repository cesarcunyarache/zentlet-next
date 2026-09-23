/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { create } from "axios";

/**
 * URL base de la API. Hoy apunta al propio Next.js; cuando el backend se
 * separe basta con cambiar `NEXT_PUBLIC_API_URL` en el entorno.
 * Vacío = mismo origen, que es lo correcto durante el SSR y en desarrollo.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Infraestructura HTTP. No sabe nada de dominios, de React ni de TanStack
 * Query: sólo configura Axios y expone los verbos.
 */
export abstract class APIService {
  protected baseURL: string;
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.axiosInstance = create({
      baseURL,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // El redirect por sesión caducada sólo tiene sentido en el navegador.
        if (typeof window !== "undefined" && error?.response?.status === 401) {
          const currentPath = window.location.pathname;
          window.location.replace(
            `/${currentPath ? `?next_path=${currentPath}` : ``}`,
          );
        }
        return Promise.reject(error);
      },
    );
  }

  get<T = unknown>(
    url: string,
    params: Record<string, unknown> = {},
    config: AxiosRequestConfig = {},
  ) {
    return this.axiosInstance.get<T>(url, { params, ...config });
  }

  post<T = unknown>(url: string, data = {}, config: AxiosRequestConfig = {}) {
    return this.axiosInstance.post<T>(url, data, config);
  }

  put<T = unknown>(url: string, data = {}, config: AxiosRequestConfig = {}) {
    return this.axiosInstance.put<T>(url, data, config);
  }

  patch<T = unknown>(url: string, data = {}, config: AxiosRequestConfig = {}) {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  delete<T = unknown>(
    url: string,
    data?: unknown,
    config: AxiosRequestConfig = {},
  ) {
    return this.axiosInstance.delete<T>(url, { data, ...config });
  }

  request<T = unknown>(config: AxiosRequestConfig = {}) {
    return this.axiosInstance.request<T>(config);
  }
}
