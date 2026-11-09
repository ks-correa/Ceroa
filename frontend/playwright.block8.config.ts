import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'block8.spec.ts',workers:1,timeout:45000,
 use:{baseURL:'http://127.0.0.1:3008',browserName:'chromium',trace:'retain-on-failure'},
 reporter:[['list'],['json',{outputFile:'../tmp/block8-playwright.json'}]]});
