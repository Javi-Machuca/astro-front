/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user?: {
      sub: string;
      email: string;
      role: 'admin' | 'user';
      name: string;
    };
  }
}
