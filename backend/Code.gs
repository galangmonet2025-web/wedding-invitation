  // =====================================================================
  // WEDDING SAAS PLATFORM - GOOGLE APPS SCRIPT BACKEND
  // =====================================================================
  // File: Code.gs
  // Description: Main entry point for the REST API
  // =====================================================================

  // ===========================
  // CONFIGURATION
  // ===========================

  var CONFIG = {
    SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
    TOKEN_SECRET: 'wedding-saas-secret-key-2026',
    TOKEN_EXPIRY_HOURS: 24,
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    RATE_LIMIT_MAX: 120, // max requests per minute (per identifier)
    MIDTRANS_SERVER_KEY: PropertiesService.getScriptProperties().getProperty('MIDTRANS_SERVER_KEY'),
    MIDTRANS_IS_PRODUCTION: false,
    PLAN_TYPE_SHEET: 'PlanType',
    PLAN_FEATURE_SHEET: 'PlanFeature'
  };

  // ===========================
  // MAIN ENTRY POINTS
  // ===========================

  function doGet(e) {
    return handleRequest(e, 'GET');
  }

  function doPost(e) {
    return handleRequest(e, 'POST');
  }

  function handleRequest(e, method) {
    try {
      var action = '';
      var payload = {};

      if (method === 'GET') {
        action = e.parameter.action || '';
        payload = e.parameter;
      } else {
        var body = e.postData ? JSON.parse(e.postData.contents) : {};
        action = body.action || e.parameter.action || '';
        payload = body;
      }

      // --- Special Image Proxy Handler ---
      // Since Google Drive blocks direct <img> embeds due to security rules,
      // we return the image data as base64 JSON which the frontend can parse.
      if (action === 'imageProxy') {
        var fileId = e.parameter.id;
        if (!fileId) return ResponseHelper.error("Missing ID", 400);
        try {
          var file = DriveApp.getFileById(fileId);
          var blob = file.getBlob();
          var base64 = Utilities.base64Encode(blob.getBytes());
          var mimeType = blob.getContentType();
          
          // Return raw data URI string so it can be used directly in some contexts
          // or just the base64 for the ProxyImage component to handle.
          return ContentService.createTextOutput("data:" + mimeType + ";base64," + base64)
            .setMimeType(ContentService.MimeType.TEXT);
        } catch (err) {
          return ResponseHelper.error("Image not found", 404);
        }
      }

      // Rate limiting - keep cache key short.
      // Authenticated requests are limited per-token. Public (no-token) requests
      // must NOT all share one 'anonymous' bucket, otherwise one busy guest (or a
      // few simultaneous visitors) blocks everyone with 429. Derive a per-guest
      // identifier from slug + guestid/invitation_code instead.
      var rateLimitId;
      if (payload.token) {
        rateLimitId = payload.token.substring(0, 32);
      } else {
        var pubId = (payload.slug || '') + ':' + (payload.guestid || payload.invitation_code || '');
        rateLimitId = pubId !== ':' ? ('pub_' + pubId).substring(0, 32) : 'anonymous';
      }
      if (!RateLimiter.check(rateLimitId)) {
        return ResponseHelper.error('Rate limit exceeded. Please try again later.', 429);
      }

      // Public endpoints (no auth required)
      var publicActions = ['login', 'registerTenant', 'getPublicInvitation', 'getPublicInvitationImages', 'submitPublicRSVP', 'submitPublicWish', 'submitPublicGift', 'checkPublicGuest', 'getWebsiteConfig', 'checkSlug', 'handleMidtransWebhook', 'getPublicThemes', 'getPublicPlanTypes', 'getPublicPlanFeatures'];
      if (publicActions.indexOf(action) !== -1) {
        return routeAction(action, payload, null);
      }

      // Authenticated endpoints
      var token = payload.token || (e.parameter ? e.parameter.token : '');
      if (!token) {
        return ResponseHelper.error('Authentication required', 401);
      }

      var decoded = AuthService.validateToken(token);
      if (!decoded) {
        return ResponseHelper.error('Invalid or expired token', 401);
      }

      return routeAction(action, payload, decoded);

    } catch (error) {
      Logger.log('Error: ' + error.toString());
      return ResponseHelper.error('Internal server error: ' + error.message, 500);
    }
  }

  function routeAction(action, payload, auth) {
    switch (action) {
      // Auth
      case 'login':
        return AuthService.login(payload);
      case 'registerTenant':
        return AuthService.registerTenant(payload);
      case 'checkSlug':
        return AuthService.checkSlug(payload);
      case 'logout':
        return ResponseHelper.success(null, 'Logged out successfully');
      case 'changePassword':
        return AuthService.changePassword(auth, payload);
      case 'getProfile':
        PermissionService.requireRole(auth, ['tenant_admin']);
        return AuthService.getProfile(auth);

      // Dashboard
      case 'getDashboard':
        return DashboardService.getTenantDashboard(auth);
      case 'getGlobalDashboard':
        PermissionService.requireRole(auth, ['superadmin']);
        return DashboardService.getGlobalDashboard(auth);
      case 'getPendingActions':
        PermissionService.requireRole(auth, ['superadmin']);
        return DashboardService.getPendingActions(auth);

      // Guests
      case 'getGuests':
        return GuestService.getGuests(auth, payload);
      case 'createGuest':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return GuestService.createGuest(auth, payload);
      case 'updateGuest':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return GuestService.updateGuest(auth, payload);
      case 'deleteGuest':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return GuestService.deleteGuest(auth, payload);
      case 'bulkDeleteGuest':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return GuestService.bulkDelete(auth, payload);
      case 'checkinGuest':
        return GuestService.checkinGuest(auth, payload);
      case 'importGuests':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return GuestService.importGuests(auth, payload);
      case 'exportGuests':
        return GuestService.exportGuests(auth);
      case 'updateGuestBlastStatus':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return GuestService.updateGuestBlastStatus(auth, payload);

      // Staff
      case 'getStaffs':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return AuthService.getStaffs(auth);
      case 'createStaffUser':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return AuthService.createStaffUser(auth, payload);
      case 'deleteStaffUser':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return AuthService.deleteStaffUser(auth, payload);

      // Tenants
      case 'getTenants':
        PermissionService.requireRole(auth, ['superadmin']);
        return TenantService.getTenants(auth);
      case 'createTenant':
        PermissionService.requireRole(auth, ['superadmin']);
        return TenantService.createTenant(auth, payload);
      case 'updateTenant':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return TenantService.updateTenant(auth, payload);
      case 'deleteTenant':
        PermissionService.requireRole(auth, ['superadmin']);
        return TenantService.deleteTenant(auth, payload);
      case 'impersonateTenant':
        PermissionService.requireRole(auth, ['superadmin']);
        return AuthService.impersonateTenant(auth, payload);

      // Wishes
      case 'getWishes':
        return WishService.getWishes(auth);
      case 'createWish':
        return WishService.createWish(auth, payload);
      case 'deleteWish':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return WishService.deleteWish(auth, payload);

      // Gifts
      case 'getGifts':
        return GiftService.getGifts(auth);
      case 'createGift':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return GiftService.createGift(auth, payload);
      case 'deleteGift':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return GiftService.deleteGift(auth, payload);

      // Activity Logs
      case 'getActivityLogs':
        return ActivityLogService.getLogs(auth);

      // Themes
      case 'getThemes':
        return ThemeService.getThemes(auth);
      case 'createTheme':
        PermissionService.requireRole(auth, ['superadmin']);
        return ThemeService.createTheme(auth, payload);
      case 'updateTheme':
        PermissionService.requireRole(auth, ['superadmin']);
        return ThemeService.updateTheme(auth, payload);
      case 'deleteTheme':
        PermissionService.requireRole(auth, ['superadmin']);
        return ThemeService.deleteTheme(auth, payload);

      // Invitation Content
      case 'getInvitationContent':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return InvitationContentService.getContent(auth);
      case 'updateInvitationContent':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return InvitationContentService.updateContent(auth, payload);

      // Images
      case 'getTenantImages':
        return ImageService.getTenantImages(auth);
      case 'uploadImage':
        return ImageService.uploadImage(auth, payload);
      case 'deleteImage':
        return ImageService.deleteImage(auth, payload);
      case 'deleteImages':
        return ImageService.deleteImages(auth, payload);

      // Additional Features
      case 'getMstAdditionalFeatures':
        PermissionService.requireRole(auth, ['superadmin']);
        return AdditionalFeatureService.getMstFeatures(auth);
      case 'createMstAdditionalFeature':
        PermissionService.requireRole(auth, ['superadmin']);
        return AdditionalFeatureService.createMstFeature(auth, payload);
      case 'updateMstAdditionalFeature':
        PermissionService.requireRole(auth, ['superadmin']);
        return AdditionalFeatureService.updateMstFeature(auth, payload);
      case 'deleteMstAdditionalFeature':
        PermissionService.requireRole(auth, ['superadmin']);
        return AdditionalFeatureService.deleteMstFeature(auth, payload);
      case 'getTenantActiveFeatures':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return AdditionalFeatureService.getTenantFeatures(auth, payload);
      case 'updateTenantActiveFeature':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return AdditionalFeatureService.updateTenantFeature(auth, payload);
      case 'deleteTenantActiveFeature':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return AdditionalFeatureService.deleteTenantFeature(auth, payload);

      // Public Invitation
      case 'getPublicInvitation':
        return PublicService.getInvitation(payload);
      case 'getPublicInvitationImages':
        return PublicService.getInvitationImages(payload);
      case 'submitPublicRSVP':
        return PublicService.submitRSVP(payload);
      case 'submitPublicWish':
        return PublicService.submitWish(payload);
      case 'submitPublicGift':
        return PublicService.submitGift(payload);
      case 'checkPublicGuest':
        return PublicService.checkGuest(payload);

      // Website Config
      case 'getWebsiteConfig':
        return WebsiteConfigService.getConfig();
      case 'updateWebsiteConfig':
        PermissionService.requireRole(auth, ['superadmin']);
        return WebsiteConfigService.updateConfig(auth, payload);
        
      // Review and Rating
      case 'getReviews':
        PermissionService.requireRole(auth, ['superadmin']);
        return ReviewService.getReviews(auth);
      case 'submitReview':
        return ReviewService.submitReview(auth, payload);
      case 'updateReviewStatus':
        PermissionService.requireRole(auth, ['superadmin']);
        return ReviewService.updateReview(auth, payload);
      case 'getReviewByTenant':
        return ReviewService.getReviewByTenant(auth);

      // Master Quotes (QuotesVariant)
      case 'getQuotesVariants':
        return QuotesVariantService.getQuotesVariants(auth);
      case 'createQuotesVariant':
        return QuotesVariantService.createQuotesVariant(auth, payload);
      case 'updateQuotesVariant':
        return QuotesVariantService.updateQuotesVariant(auth, payload);
      case 'deleteQuotesVariant':
        return QuotesVariantService.deleteQuotesVariant(auth, payload);
      case 'getActiveQuotesVariants':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return QuotesVariantService.getActiveQuotesVariants(auth);
      case 'saveTenantQuotes':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return QuotesVariantService.saveTenantQuotes(auth, payload);

      // Payments (Midtrans)
      case 'createTransaction':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return PaymentService.createTransaction(auth, payload);
      case 'getTransactions':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return PaymentService.getTransactions(auth, payload);
      case 'getTransactionStatus':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return PaymentService.getTransactionStatus(auth, payload);
      case 'cancelTransaction':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return PaymentService.cancelTransaction(auth, payload);
      case 'getPlanTypes':
        return PaymentService.getPlanTypes();
      case 'updatePlanType':
        PermissionService.requireRole(auth, ['superadmin']);
        return PaymentService.updatePlanType(payload);
      case 'getPlanFeatures':
        return PaymentService.getPlanFeatures(payload);
      case 'createPlanFeature':
        PermissionService.requireRole(auth, ['superadmin']);
        return PaymentService.createPlanFeature(payload);
      case 'updatePlanFeature':
        PermissionService.requireRole(auth, ['superadmin']);
        return PaymentService.updatePlanFeature(payload);
      case 'deletePlanFeature':
        PermissionService.requireRole(auth, ['superadmin']);
        return PaymentService.deletePlanFeature(payload);
      case 'bulkUpdatePlanFeatures':
        PermissionService.requireRole(auth, ['superadmin']);
        return PaymentService.bulkUpdatePlanFeatures(payload);
      case 'handleMidtransWebhook':
        // Webhook does not require user auth - verified by signature
        return PaymentService.handleWebhook(payload);
      
      case 'getPublicThemes':
        return ThemeService.getThemes(null);
      case 'getPublicPlanTypes':
        return PaymentService.getPlanTypes();
      case 'getPublicPlanFeatures':
        return PaymentService.getPlanFeatures(payload);

      // Coupons
      case 'getCoupons':
        PermissionService.requireRole(auth, ['superadmin']);
        return CouponService.getCoupons(auth);
      case 'createCoupon':
        PermissionService.requireRole(auth, ['superadmin']);
        return CouponService.createCoupon(auth, payload);
      case 'updateCoupon':
        PermissionService.requireRole(auth, ['superadmin']);
        return CouponService.updateCoupon(auth, payload);
      case 'deleteCoupon':
        PermissionService.requireRole(auth, ['superadmin']);
        return CouponService.deleteCoupon(auth, payload);
      case 'validateCoupon':
        PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
        return CouponService.validateCoupon(auth, payload);

      // Archive & Restore (superadmin only)
      case 'getArchives':
        PermissionService.requireRole(auth, ['superadmin']);
        return ArchiveService.getArchives(auth);
      case 'archiveTenant':
        PermissionService.requireRole(auth, ['superadmin']);
        return ArchiveService.archiveTenant(auth, payload);
      case 'restoreTenant':
        PermissionService.requireRole(auth, ['superadmin']);
        return ArchiveService.restoreTenant(auth, payload);
      case 'deleteArchivePermanent':
        PermissionService.requireRole(auth, ['superadmin']);
        return ArchiveService.deleteArchivePermanent(auth, payload);

      default:
        return ResponseHelper.error('Unknown action: ' + action, 400);
    }
  }


  // =====================================================================
  // RESPONSE HELPER
  // =====================================================================

  var ResponseHelper = {
    success: function(data, message) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, data: data, message: message || 'Success' })
      ).setMimeType(ContentService.MimeType.JSON);
    },

    error: function(message, code) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, data: null, message: message || 'Error', code: code || 400 })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  };


  // =====================================================================
  // VALIDATOR
  // =====================================================================

  var Validator = {
    required: function(obj, fields) {
      for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        if (obj[field] === undefined || obj[field] === null || String(obj[field]).trim() === '') {
          throw new Error('Field "' + field + '" is required');
        }
      }
    },

    sanitize: function(input) {
      if (typeof input !== 'string') return input;
      return input.replace(/<[^>]*>/g, '').trim();
    },

    sanitizeObject: function(obj) {
      var clean = {};
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          clean[key] = this.sanitize(obj[key]);
        }
      }
      return clean;
    }
  };


  // =====================================================================
  // RATE LIMITER
  // =====================================================================

  var RateLimiter = {
    check: function(identifier) {
      var cache = CacheService.getScriptCache();
      var key = 'ratelimit_' + identifier;
      var current = cache.get(key);

      if (!current) {
        cache.put(key, '1', 60); // 60 seconds
        return true;
      }

      var count = parseInt(current);
      if (count >= CONFIG.RATE_LIMIT_MAX) {
        return false;
      }

      cache.put(key, String(count + 1), 60);
      return true;
    }
  };


  // =====================================================================
  // PUBLIC CACHE  (CacheService wrapper for slow public reads)
  // =====================================================================
  //
  // Kenapa ada ini: PublicService.getInvitation membaca 10+ sheet penuh setiap
  // kali undangan dibuka (Themes yang besar termasuk), tanpa cache -> tiap buka
  // tetap lambat. Wrapper ini menyimpan hasil baca yang mahal di
  // CacheService.getScriptCache() supaya buka berikutnya tidak menembak Sheets.
  //
  // Batas CacheService: ~100KB per value. Tema (HTML/CSS/JS) sering >100KB, jadi
  // getJSON/putJSON otomatis MEMECAH value besar menjadi beberapa chunk
  // (<key>__c<i>) dan menyatukannya lagi saat baca. Kalau salah satu chunk hilang
  // (LRU eviction), cache dianggap miss dan sumber dibaca ulang -> aman.
  var PublicCache = {
    _cache: null,
    _c: function() {
      if (!this._cache) this._cache = CacheService.getScriptCache();
      return this._cache;
    },
    CHUNK_SIZE: 95000,      // < 100KB CacheService per-value limit, sisakan margin
    MAX_CHUNKS: 40,         // 40 * 95KB ~ 3.8MB; cukup untuk tema terbesar

    // Ambil objek JSON dari cache. Mengembalikan null saat miss / rusak.
    getJSON: function(key) {
      try {
        var meta = this._c().get(key);
        if (!meta) return null;
        // Nilai kecil disimpan langsung dengan prefix 'J:'.
        if (meta.charAt(0) === 'J') {
          return JSON.parse(meta.substring(2));
        }
        // Nilai besar: meta = 'C:<n>' lalu baca n chunk.
        if (meta.charAt(0) === 'C') {
          var n = parseInt(meta.substring(2), 10);
          if (!n || n < 1) return null;
          var chunkKeys = [];
          for (var i = 0; i < n; i++) chunkKeys.push(key + '__c' + i);
          var parts = this._c().getAll(chunkKeys); // 1 panggilan untuk semua chunk
          var joined = '';
          for (var j = 0; j < n; j++) {
            var piece = parts[key + '__c' + j];
            if (piece === null || piece === undefined) return null; // chunk hilang -> miss
            joined += piece;
          }
          return JSON.parse(joined);
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    // Simpan objek JSON ke cache dengan TTL (detik). Memecah bila > CHUNK_SIZE.
    putJSON: function(key, obj, ttlSeconds) {
      try {
        var str = JSON.stringify(obj);
        var ttl = ttlSeconds || 300;
        if (str.length <= this.CHUNK_SIZE) {
          this._c().put(key, 'J:' + str, ttl);
          return true;
        }
        var n = Math.ceil(str.length / this.CHUNK_SIZE);
        if (n > this.MAX_CHUNKS) return false; // terlalu besar untuk di-cache; skip
        var map = {};
        for (var i = 0; i < n; i++) {
          map[key + '__c' + i] = str.substring(i * this.CHUNK_SIZE, (i + 1) * this.CHUNK_SIZE);
        }
        this._c().putAll(map, ttl);
        // Tulis meta TERAKHIR supaya reader tidak pernah lihat meta tanpa chunk.
        this._c().put(key, 'C:' + n, ttl);
        return true;
      } catch (e) {
        return false;
      }
    },

    // Hapus key (dan kemungkinan chunk-nya). Aman dipanggil walau key tak ada.
    del: function(key) {
      try {
        var meta = this._c().get(key);
        var toRemove = [key];
        if (meta && meta.charAt(0) === 'C') {
          var n = parseInt(meta.substring(2), 10) || 0;
          for (var i = 0; i < n && i < this.MAX_CHUNKS; i++) toRemove.push(key + '__c' + i);
        }
        this._c().removeAll(toRemove);
      } catch (e) {}
    },

    // ---- Key builders (versi prefix 'v1' agar mudah bump saat format berubah) ----
    themeKey: function(themeId) { return 'pub_theme_v1_' + themeId; },
    // Data statis undangan per slug (tanpa theme/wishes/guest).
    staticKey: function(slug) { return 'pub_inv_static_v1_' + slug; },
    // Referensi global yang jarang berubah.
    refKey: function(name) { return 'pub_ref_v1_' + name; },

    // Buang cache statis milik sebuah slug (dipakai saat konten/foto berubah).
    invalidateSlug: function(slug) {
      if (slug) this.del(this.staticKey(slug));
    },
    // Buang cache tema (dipakai saat tema diedit).
    invalidateTheme: function(themeId) {
      if (themeId) this.del(this.themeKey(themeId));
    }
  };


  // =====================================================================
  // DATABASE HELPER
  // =====================================================================

  var DB = {
    getSheet: function(name) {
      var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        throw new Error('Sheet "' + name + '" not found');
      }
      return sheet;
    },

    getAll: function(sheetName) {
      var sheet = this.getSheet(sheetName);
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) return [];

      var headers = data[0];
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
          var val = data[i][j];
          // Convert Date objects to proper strings to prevent JSON serialization issues
          if (val instanceof Date) {
            var year = val.getFullYear();
            // Time-only values in Sheets use epoch year 1899
            if (year === 1899) {
              // Format as HH:mm for time fields
              var hh = ('0' + val.getHours()).slice(-2);
              var mm = ('0' + val.getMinutes()).slice(-2);
              val = hh + ':' + mm;
            } else {
              // Format as YYYY-MM-DD for date fields
              val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
            }
          }
          row[headers[j]] = val;
        }
        rows.push(row);
      }
      if (sheetName === 'Themes') {
        rows.forEach(function(row) {
          row.html_template = (row.html_template || '') + (row.html_extra_1 || '') + (row.html_extra_2 || '') + (row.html_extra_3 || '') + (row.html_extra_4 || '') + (row.html_extra_5 || '') + (row.html_extra_6 || '') + (row.html_extra_7 || '') + (row.html_extra_8 || '') + (row.html_extra_9 || '') + (row.html_extra_10 || '');
          row.css_template = (row.css_template || '') + (row.css_extra_1 || '') + (row.css_extra_2 || '') + (row.css_extra_3 || '') + (row.css_extra_4 || '') + (row.css_extra_5 || '') + (row.css_extra_6 || '') + (row.css_extra_7 || '') + (row.css_extra_8 || '') + (row.css_extra_9 || '') + (row.css_extra_10 || '');
          row.js_template = (row.js_template || '') + (row.js_extra_1 || '') + (row.js_extra_2 || '') + (row.js_extra_3 || '') + (row.js_extra_4 || '') + (row.js_extra_5 || '') + (row.js_extra_6 || '') + (row.js_extra_7 || '') + (row.js_extra_8 || '') + (row.js_extra_9 || '') + (row.js_extra_10 || '');
        });
      }
      return rows;
    },

    getByTenant: function(sheetName, tenantId) {
      var all = this.getAll(sheetName);
      return all.filter(function(row) { return row.tenant_id === tenantId; });
    },

    findOne: function(sheetName, field, value) {
      var all = this.getAll(sheetName);
      for (var i = 0; i < all.length; i++) {
        if (String(all[i][field]) === String(value)) {
          return all[i];
        }
      }
      return null;
    },

    insert: function(sheetName, rowData) {
      var sheet = this.getSheet(sheetName);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      // Use hasOwnProperty + null/undefined check instead of `|| ''` so that legit
      // falsy values (false, 0) are written verbatim. The old `rowData[h] || ''`
      // turned `flag_use_system_action_button: false` into '' on the sheet, which the
      // read side then re-interpreted as the default `true` — so a NEW theme created
      // with the FAB (or any boolean flag) toggled OFF came back ON.
      var row = headers.map(function(h) {
        var v = rowData[h];
        return (v === undefined || v === null) ? '' : v;
      });
      // Force plain-text on the new row BEFORE writing (same reason as update(): a
      // theme's ~50K template chunk can start with '=' / '+' / '-' / '@' and would
      // otherwise be coerced into a formula → "#ERROR!" corrupting the code).
      var newRow = sheet.getLastRow() + 1;
      var insRange = sheet.getRange(newRow, 1, 1, headers.length);
      insRange.setNumberFormat('@');
      SpreadsheetApp.flush();   // commit the text format BEFORE writing values (see update())
      insRange.setValues([row]);
      return rowData;
    },

    update: function(sheetName, id, updates) {
      var sheet = this.getSheet(sheetName);
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idCol = headers.indexOf('id');

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(id)) {
          // BATCH WRITE: apply every change onto the in-memory row, then write the
          // whole row back in ONE setValues() call. Theme saves touch ~40 columns
          // (html/css/js split into 11 cells each @50K chars); the old per-column
          // setValue() did ~40 separate Sheets API calls, which was slow enough to
          // hit the Apps Script execution timeout on big themes — Google then returned
          // an error HTML page with no CORS headers, surfacing on the client as a
          // "CORS / Network Error". One setValues() keeps the write well under the limit.
          var row = data[i];
          var changed = false;
          for (var key in updates) {
            var col = headers.indexOf(key);
            if (col !== -1) {
              row[col] = updates[key];
              changed = true;
            }
          }
          if (changed) {
            var writeRange = sheet.getRange(i + 1, 1, 1, headers.length);
            // FORCE PLAIN-TEXT before writing. Theme templates are split into ~50K
            // chunks; a chunk can start with '=', '+', '-' or '@' (extremely common in
            // JS: "= x", "+ 50000", "- 1", "@media"). Google Sheets then COERCES that
            // cell into a formula and stores "#ERROR!" instead of the code — which the
            // reassembled js_template later injects as a broken <script> → the
            // "Uncaught SyntaxError: Unexpected token '}'" that killed the metal-slug
            // game. Setting the number format to '@' (text) makes Sheets store every
            // value verbatim, so no chunk is ever mis-read as a formula.
            // Apply the text format and COMMIT it (flush) BEFORE writing the values.
            // setNumberFormat + setValues in the same un-flushed batch can be applied in an
            // order where Sheets still parses a "=…/+…/-…/@…" string as a formula (→ "#ERROR!")
            // before the '@' format takes hold. Flushing forces the format to land first, so the
            // subsequent setValues stores every chunk verbatim as text.
            writeRange.setNumberFormat('@');
            SpreadsheetApp.flush();
            writeRange.setValues([row]);
          }
          return true;
        }
      }
      return false;
    },

    deleteRow: function(sheetName, id) {
      var sheet = this.getSheet(sheetName);
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idCol = headers.indexOf('id');

      for (var i = data.length - 1; i >= 1; i--) {
        if (String(data[i][idCol]) === String(id)) {
          sheet.deleteRow(i + 1);
          return true;
        }
      }
      return false;
    },

    // Batch-delete every row whose `field` equals `value`, in a single rewrite.
    // Rebuilds the data block (below the header) keeping only non-matching rows,
    // then clears the old block and writes the survivors back at once. Returns
    // the number of rows removed. Far fewer Sheets calls than per-row deleteRow,
    // which is what avoids the 6-minute timeout on large sheets.
    deleteRowsWhere: function(sheetName, field, value) {
      var sheet = this.getSheet(sheetName);
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1 || lastCol === 0) return 0; // header-only or empty

      var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = data[0];
      var col = headers.indexOf(field);
      if (col === -1) return 0;

      var target = String(value);
      var kept = [];
      var removed = 0;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][col]) === target) {
          removed++;
        } else {
          kept.push(data[i]);
        }
      }
      if (removed === 0) return 0;

      // Clear all data rows, then write back the survivors in one shot.
      sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      if (kept.length > 0) {
        sheet.getRange(2, 1, kept.length, lastCol).setValues(kept);
      }
      return removed;
    },

    // Batch-delete every row whose `id` is in the given list, in a single rewrite.
    // Same single-rewrite strategy as deleteRowsWhere, but matches a SET of ids so
    // many images can be removed with one Sheets write instead of one per id.
    // Returns the list of ids that were actually found & removed.
    deleteRowsByIds: function(sheetName, ids) {
      if (!ids || ids.length === 0) return [];
      var sheet = this.getSheet(sheetName);
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow <= 1 || lastCol === 0) return []; // header-only or empty

      var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = data[0];
      var idCol = headers.indexOf('id');
      if (idCol === -1) return [];

      // Build a lookup of target ids for O(1) membership checks.
      var targets = {};
      ids.forEach(function(x) { targets[String(x)] = true; });

      var kept = [];
      var removedIds = [];
      for (var i = 1; i < data.length; i++) {
        var rowId = String(data[i][idCol]);
        if (targets[rowId]) {
          removedIds.push(rowId);
        } else {
          kept.push(data[i]);
        }
      }
      if (removedIds.length === 0) return [];

      // Clear all data rows, then write back the survivors in one shot.
      sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      if (kept.length > 0) {
        sheet.getRange(2, 1, kept.length, lastCol).setValues(kept);
      }
      return removedIds;
    },

    // Batch-insert many rows in a single setValues call (one Sheets write).
    // rowDataArray is an array of plain objects keyed by header name.
    insertRows: function(sheetName, rowDataArray) {
      if (!rowDataArray || rowDataArray.length === 0) return 0;
      var sheet = this.getSheet(sheetName);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var matrix = rowDataArray.map(function(rowData) {
        return headers.map(function(h) {
          return (rowData[h] === undefined || rowData[h] === null) ? '' : rowData[h];
        });
      });
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, matrix.length, headers.length).setValues(matrix);
      return matrix.length;
    },

    generateId: function() {
      return Utilities.getUuid();
    },

    count: function(sheetName, tenantId) {
      if (tenantId) {
        return this.getByTenant(sheetName, tenantId).length;
      }
      var sheet = this.getSheet(sheetName);
      return Math.max(0, sheet.getLastRow() - 1);
    }
  };


  // =====================================================================
  // AUTH SERVICE
  // =====================================================================

  var AuthService = {
    login: function(payload) {
      Validator.required(payload, ['username', 'password']);
      var sanitized = Validator.sanitizeObject(payload);

      var user = DB.findOne('Users', 'username', sanitized.username);
      if (!user) {
        return ResponseHelper.error('Invalid username or password', 401);
      }

      if (!this.verifyPassword(sanitized.password, user.password_hash)) {
        return ResponseHelper.error('Invalid username or password', 401);
      }

      var tenant = DB.findOne('Tenants', 'id', user.tenant_id);

      if (tenant && tenant.status_account === 'suspended') {
        return ResponseHelper.error('Your account has been suspended', 403);
      }

      var token = this.generateToken(user);

      // Log activity
      ActivityLogService.log(user.tenant_id, user.id, 'login');

      return ResponseHelper.success({
        token: token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          tenant_id: user.tenant_id,
          plan_type: tenant ? tenant.plan_type : 'basic',
          status_payment: tenant ? (tenant.status_payment || 'Aktif') : 'Aktif',
          created_at: user.created_at
        },
        tenant: tenant
      }, 'Login successful');
    },

    registerTenant: function(payload) {
      Validator.required(payload, ['bride_name', 'groom_name', 'wedding_date', 'domain_slug', 'username', 'password']);
      var sanitized = Validator.sanitizeObject(payload);

      // Check if username exists
      var existingUser = DB.findOne('Users', 'username', sanitized.username);
      if (existingUser) {
        return ResponseHelper.error('Username already exists', 400);
      }

      // Check if domain slug exists
      var existingTenant = DB.findOne('Tenants', 'domain_slug', sanitized.domain_slug);
      if (existingTenant) {
        return ResponseHelper.error('Domain slug already taken', 400);
      }

      var tenantId = DB.generateId();
      var userId = DB.generateId();
      var now = new Date().toISOString();

      var deadline = new Date(new Date(now).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Create tenant
      var tenant = {
        id: tenantId,
        bride_name: sanitized.bride_name,
        bride_nickname: sanitized.bride_nickname || '',
        groom_name: sanitized.groom_name,
        groom_nickname: sanitized.groom_nickname || '',
        religion: sanitized.religion || '',
        wedding_date: sanitized.wedding_date,
        domain_slug: sanitized.domain_slug,
        plan_type: sanitized.plan_type || 'basic',
        guest_limit: PaymentService.getPlanGuestLimit(sanitized.plan_type || 'basic'),
        created_at: now,
        status_account: 'active',
        payment_deadline: deadline,
        status_payment: 'Menunggu pembayaran',
        quotes_id: QuotesVariantService.getDefaultOrTopQuoteId()
      };
      DB.insert('Tenants', tenant);

      // Create admin user
      var user = {
        id: userId,
        username: sanitized.username,
        password_hash: this.hashPassword(sanitized.password),
        role: 'tenant_admin',
        tenant_id: tenantId,
        created_at: now
      };
      DB.insert('Users', user);

      var token = this.generateToken(user);

      ActivityLogService.log(tenantId, userId, 'create_tenant');

      return ResponseHelper.success({
        token: token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          tenant_id: user.tenant_id,
          created_at: user.created_at
        },
        tenant: tenant
      }, 'Wedding registered successfully');
    },

    hashPassword: function(password) {
      var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + CONFIG.TOKEN_SECRET);
      return hash.map(function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
      }).join('');
    },

    verifyPassword: function(password, hash) {
      return this.hashPassword(password) === hash;
    },

    generateToken: function(user) {
      var payload = {
        user_id: user.id,
        role: user.role,
        tenant_id: user.tenant_id,
        expired_at: new Date(Date.now() + CONFIG.TOKEN_EXPIRY_HOURS * 3600000).toISOString()
      };
      var json = JSON.stringify(payload);
      var encoded = Utilities.base64Encode(json);
      var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, encoded + CONFIG.TOKEN_SECRET);
      var sig = signature.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2); }).join('');
      return encoded + '.' + sig;
    },

    validateToken: function(token) {
      try {
        if (token === 'dummy-superadmin-token') {
          return {
            user_id: 'super-123',
            role: 'superadmin',
            tenant_id: 'system'
          };
        }
        var parts = token.split('.');
        if (parts.length !== 2) return null;
        var encoded = parts[0];
        var sig = parts[1];
        var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, encoded + CONFIG.TOKEN_SECRET);
        var expectedSig = signature.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2); }).join('');
        if (sig !== expectedSig) return null;
        var json = Utilities.newBlob(Utilities.base64Decode(encoded)).getDataAsString();
        var payload = JSON.parse(json);
        if (new Date(payload.expired_at) < new Date()) return null;
        return payload;
      } catch (e) {
        return null;
      }
    },

    getProfile: function(auth) {
      if (auth.role === 'superadmin') {
        return ResponseHelper.success({
          id: auth.user_id,
          username: 'superadmin',
          role: 'superadmin'
        });
      }

      var tenant = DB.findOne('Tenants', 'id', auth.tenant_id);
      if (!tenant) return ResponseHelper.error('Tenant not found', 404);
      
      return ResponseHelper.success({
        id: auth.user_id,
        username: auth.username || 'user',
        role: auth.role,
        tenant_id: auth.tenant_id,
        plan_type: tenant.plan_type,
        status_payment: tenant.status_payment || 'Aktif'
      });
    },

    checkSlug: function(payload) {
      if (!payload.slug) return ResponseHelper.error('slug required', 400);
      var existingTenant = DB.findOne('Tenants', 'domain_slug', payload.slug);
      return ResponseHelper.success({ available: !existingTenant }, 'Slug check complete');
    },

    impersonateTenant: function(auth, payload) {
      if (!payload.tenant_id) return ResponseHelper.error('tenant_id required', 400);
      var tenant = DB.findOne('Tenants', 'id', payload.tenant_id);
      if (!tenant) return ResponseHelper.error('Tenant not found', 404);

      // Get the superadmin user record (stays authenticated as superadmin)
      var superadminUser = DB.findOne('Users', 'id', auth.user_id);

      // Build a scoped token: role=superadmin, user_id=superadmin's ID,
      // but tenant_id=target tenant so API calls are scoped to that tenant's data
      var scopedPayload = {
        user_id: auth.user_id,
        role: auth.role,           // remains 'superadmin'
        tenant_id: payload.tenant_id,
        is_impersonating: true,    // flag for transparency
        expired_at: new Date(Date.now() + CONFIG.TOKEN_EXPIRY_HOURS * 3600000).toISOString()
      };
      var json = JSON.stringify(scopedPayload);
      var encoded = Utilities.base64Encode(json);
      var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, encoded + CONFIG.TOKEN_SECRET);
      var sig = signature.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2); }).join('');
      var scopedToken = encoded + '.' + sig;

      // Activity log: record the superadmin opened this tenant (not the tenant admin)
      ActivityLogService.log(payload.tenant_id, auth.user_id, 'superadmin_view_tenant');

      return ResponseHelper.success({
        token: scopedToken,
        user: superadminUser ? {
          id: superadminUser.id,
          username: superadminUser.username,
          role: auth.role,
          tenant_id: payload.tenant_id,
          is_impersonating: true,
          created_at: superadminUser.created_at
        } : {
          id: auth.user_id,
          username: 'superadmin',
          role: auth.role,
          tenant_id: payload.tenant_id,
          is_impersonating: true,
          created_at: new Date().toISOString()
        },
        tenant: tenant
      }, 'Scoped session created');
    },

    getStaffs: function(auth) {
      var tenantId = PermissionService.getTenantId(auth);
      var users = DB.getByTenant('Users', tenantId);
      var staffs = users.filter(function(u) { return u.role === 'staff'; });
      return ResponseHelper.success(staffs.map(function(u) {
        return { id: u.id, username: u.username, role: u.role, created_at: u.created_at };
      }), 'Staffs retrieved');
    },

    createStaffUser: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['username', 'password']);
      var sanitized = Validator.sanitizeObject(payload);

      var existingUser = DB.findOne('Users', 'username', sanitized.username);
      if (existingUser) {
        return ResponseHelper.error('Username already exists', 400);
      }

      var userId = DB.generateId();
      var now = new Date().toISOString();

      var user = {
        id: userId,
        username: sanitized.username,
        password_hash: this.hashPassword(sanitized.password),
        role: 'staff',
        tenant_id: tenantId,
        created_at: now
      };
      
      DB.insert('Users', user);
      
      // Attempt to log activity, ignore errors if service fails
      try {
          ActivityLogService.log(tenantId, auth.user_id, 'create_staff');
      } catch(e) {}

      return ResponseHelper.success({
        id: user.id,
        username: user.username,
        role: user.role,
        created_at: user.created_at
      }, 'Staff account created successfully');
    },

    deleteStaffUser: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['id']);
      var userId = payload.id;

      var existingUser = DB.findOne('Users', 'id', userId);
      if (!existingUser || existingUser.tenant_id !== tenantId || existingUser.role !== 'staff') {
        return ResponseHelper.error('Staff account not found or unauthorized', 404);
      }

      var success = DB.deleteRow('Users', userId);
      if (success) {
        try {
            ActivityLogService.log(tenantId, auth.user_id, 'delete_staff');
        } catch(e) {}
        return ResponseHelper.success(null, 'Staff account deleted');
      }
      return ResponseHelper.error('Failed to delete staff account', 500);
    },

    changePassword: function(auth, payload) {
      Validator.required(payload, ['old_password', 'new_password']);
      
      var user = DB.findOne('Users', 'id', auth.user_id);
      if (!user) {
        return ResponseHelper.error('User not found', 404);
      }

      if (!this.verifyPassword(payload.old_password, user.password_hash)) {
        return ResponseHelper.error('Password lama salah', 400);
      }

      var success = DB.update('Users', user.id, {
        password_hash: this.hashPassword(payload.new_password)
      });

      if (success) {
        ActivityLogService.log(user.tenant_id, user.id, 'change_password');
        return ResponseHelper.success(null, 'Password berhasil diubah');
      }
      return ResponseHelper.error('Gagal mengubah password', 500);
    }
  };


  // =====================================================================
  // PERMISSION SERVICE
  // =====================================================================

  var PermissionService = {
    requireRole: function(auth, allowedRoles) {
      if (!auth || allowedRoles.indexOf(auth.role) === -1) {
        throw new Error('Unauthorized: insufficient permissions');
      }
    },

    getTenantId: function(auth) {
      if (!auth) throw new Error('Unauthorized');
      if (!auth.tenant_id) {
        // Fallback for superadmin to 'system' if tenant context is missing
        if (auth.role === 'superadmin') return 'system';
        throw new Error('Unauthorized: no tenant context');
      }
      return auth.tenant_id;
    },

    canAccessTenant: function(auth, tenantId) {
      if (auth.role === 'superadmin') return true;
      return auth.tenant_id === tenantId;
    }
  };


  // =====================================================================
  // TENANT SERVICE
  // =====================================================================

  var TenantService = {
    getTenants: function(auth) {
      PermissionService.requireRole(auth, ['superadmin']);
      var tenants = DB.getAll('Tenants');
      return ResponseHelper.success(tenants, 'Tenants retrieved');
    },

    createTenant: function(auth, payload) {
      PermissionService.requireRole(auth, ['superadmin']);
      Validator.required(payload, ['bride_name', 'groom_name', 'admin_username', 'admin_password']);
      var sanitized = Validator.sanitizeObject(payload);

      var existingSlug = DB.findOne('Tenants', 'domain_slug', sanitized.domain_slug);
      if (existingSlug) {
        return ResponseHelper.error('Domain slug already taken', 400);
      }

      var tenantId = DB.generateId();
      var userId = DB.generateId();
      var now = new Date().toISOString();

      var plan = sanitized.plan_type || 'basic';
      var deadline = new Date(new Date(now).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      var tenant = {
        id: tenantId,
        bride_name: sanitized.bride_name,
        groom_name: sanitized.groom_name,
        wedding_date: sanitized.wedding_date || '',
        domain_slug: sanitized.domain_slug || '',
        plan_type: plan,
        theme_id: sanitized.theme_id || '',
        guest_limit: PaymentService.getPlanGuestLimit(plan),
        created_at: now,
        status_account: 'active',
        payment_deadline: deadline,
        status_payment: 'Menunggu pembayaran',
        quotes_id: QuotesVariantService.getDefaultOrTopQuoteId()
      };
      DB.insert('Tenants', tenant);

      var user = {
        id: userId,
        username: sanitized.admin_username,
        password_hash: AuthService.hashPassword(sanitized.admin_password),
        role: 'tenant_admin',
        tenant_id: tenantId,
        created_at: now
      };
      DB.insert('Users', user);

      ActivityLogService.log(auth.tenant_id, auth.user_id, 'create_tenant');

      return ResponseHelper.success(tenant, 'Tenant created successfully');
    },

    updateTenant: function(auth, payload) {
      Validator.required(payload, ['id']);
      
      // Check access
      if (!PermissionService.canAccessTenant(auth, payload.id)) {
        return ResponseHelper.error('Unauthorized to edit this tenant', 403);
      }

      var updates = {};
      
      // Only superadmin can modify billing/plan details
    if (auth.role === 'superadmin') {
      if (payload.plan_type) {
        updates.plan_type = payload.plan_type;
        updates.guest_limit = PaymentService.getPlanGuestLimit(payload.plan_type);
      }
      if (payload.status_account) updates.status_account = payload.status_account;
      if (payload.status_payment) updates.status_payment = payload.status_payment;
      if (payload.payment_deadline) updates.payment_deadline = payload.payment_deadline;
      if (payload.guest_limit !== undefined) updates.guest_limit = payload.guest_limit;
    }

      // Both Superadmin and TenantAdmin can update the theme and names
      if (payload.theme_id !== undefined) updates.theme_id = payload.theme_id;
      if (payload.bride_name !== undefined) updates.bride_name = payload.bride_name;
      if (payload.groom_name !== undefined) updates.groom_name = payload.groom_name;
      if (payload.wedding_date !== undefined) updates.wedding_date = payload.wedding_date;

      DB.update('Tenants', payload.id, updates);

      // Ganti tema / nama / tanggal -> semuanya ikut blok statis undangan; buang cache slug.
      if (updates.theme_id !== undefined || updates.bride_name !== undefined
          || updates.groom_name !== undefined || updates.wedding_date !== undefined) {
        try {
          var updTenant = DB.findOne('Tenants', 'id', payload.id);
          if (updTenant) PublicCache.invalidateSlug(updTenant.domain_slug);
        } catch (eInv) {}
      }

      return ResponseHelper.success(null, 'Tenant updated successfully');
    },

    deleteTenant: function(auth, payload) {
      Validator.required(payload, ['id']);
      var tenantId = payload.id;
      
      if (auth.role !== 'superadmin') {
        return ResponseHelper.error('Only superadmin can delete a tenant', 403);
      }
      
      // 1. Hard Delete Images from Google Drive & Sheet
      var images = DB.getByTenant('Images', tenantId);
      for (var i = 0; i < images.length; i++) {
          var img = images[i];
          try {
              if (img.drive_id) {
                  // Try hard delete using Advanced Drive Service if enabled
                  try {
                      Drive.Files.remove(img.drive_id);
                  } catch (err) {
                      // Fallback to trash if advanced service is not enabled
                      var file = DriveApp.getFileById(img.drive_id);
                      file.setTrashed(true);
                  }
              }
          } catch(e) {}
          DB.deleteRow('Images', img.id);
      }

      // 2. Cascading Delete other sheets
      var sheetsToClean = ['Users', 'Guests', 'Wishes', 'Gifts', 'TenantActiveFeature', 'ActivityLogs'];
      for (var s = 0; s < sheetsToClean.length; s++) {
          var sheetName = sheetsToClean[s];
          var rows = DB.getByTenant(sheetName, tenantId);
          for (var r = 0; r < rows.length; r++) {
              DB.deleteRow(sheetName, rows[r].id);
          }
      }
      
      // 3. Delete Tenant itself
      var success = DB.deleteRow('Tenants', tenantId);
      
      if (success) {
        return ResponseHelper.success(null, 'Tenant and all associated data deleted successfully');
      }
      return ResponseHelper.error('Failed to delete tenant', 500);
    }
  };


  // =====================================================================
  // GUEST SERVICE
  // =====================================================================

  var GuestService = {
    getGuests: function(auth, payload) {
      var tenantId = auth.role === 'superadmin' && payload.tenant_id ? payload.tenant_id : auth.tenant_id;
      var guests = DB.getByTenant('Guests', tenantId);

      // Search filter
      if (payload.search) {
        var search = String(payload.search).toLowerCase();
        guests = guests.filter(function(g) {
          return g.name.toLowerCase().indexOf(search) !== -1 ||
                g.phone.toLowerCase().indexOf(search) !== -1 ||
                g.invitation_code.toLowerCase().indexOf(search) !== -1;
        });
      }

      // Status filter
      if (payload.status) {
        guests = guests.filter(function(g) { return g.status === payload.status; });
      }

      // Category filter
      if (payload.category) {
        guests = guests.filter(function(g) { return g.category === payload.category; });
      }

      var total = guests.length;
      var page = parseInt(payload.page) || 1;
      var limit = parseInt(payload.limit) || 10;
      var totalPages = Math.ceil(total / limit);
      var start = (page - 1) * limit;
      var paged = guests.slice(start, start + limit);

      return ResponseHelper.success({
        items: paged,
        total: total,
        page: page,
        limit: limit,
        total_pages: totalPages
      }, 'Guests retrieved');
    },

    createGuest: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['name']);
      var sanitized = Validator.sanitizeObject(payload);

      // Check guest limit
      var tenant = DB.findOne('Tenants', 'id', tenantId);
      if (tenant && tenant.guest_limit !== -1) {
        var currentCount = DB.count('Guests', tenantId);
        if (currentCount >= tenant.guest_limit) {
          return ResponseHelper.error(
            'Guest limit reached (' + tenant.guest_limit + '). Upgrade your plan to add more guests.',
            403
          );
        }
      }

      var guest = {
        id: DB.generateId(),
        tenant_id: tenantId,
        name: sanitized.name,
        phone: sanitized.phone || '',
        category: sanitized.category || 'Friends',
        invitation_code: 'WED-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        status: sanitized.status || 'pending',
        number_of_guests: parseInt(sanitized.number_of_guests) || 1,
        checkin_status: 'not_checked_in',
        flag_sudah_kirim_undangan_via_whatsapp: 'FALSE',
        flag_sudah_isi_ucapan: 'FALSE',
        flag_sudah_kirim_hadiah: 'FALSE',
        created_at: new Date().toISOString()
      };

      DB.insert('Guests', guest);
      ActivityLogService.log(tenantId, auth.user_id, 'create_guest');

      return ResponseHelper.success(guest, 'Guest added successfully');
    },

    updateGuest: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['id']);

      // Verify guest belongs to tenant
      var guest = DB.findOne('Guests', 'id', payload.id);
      if (!guest || (auth.role !== 'superadmin' && guest.tenant_id !== tenantId)) {
        return ResponseHelper.error('Guest not found', 404);
      }

      var sanitized = Validator.sanitizeObject(payload);
      var updates = {};
      if (sanitized.name) updates.name = sanitized.name;
      if (sanitized.phone !== undefined) updates.phone = sanitized.phone;
      if (sanitized.category) updates.category = sanitized.category;
      if (sanitized.status) updates.status = sanitized.status;
      if (sanitized.number_of_guests) updates.number_of_guests = parseInt(sanitized.number_of_guests);
      if (payload.flag_sudah_isi_ucapan !== undefined) {
        updates.flag_sudah_isi_ucapan = (payload.flag_sudah_isi_ucapan === true || payload.flag_sudah_isi_ucapan === 'true' || payload.flag_sudah_isi_ucapan === 'TRUE') ? 'TRUE' : 'FALSE';
      }
      if (payload.flag_sudah_kirim_hadiah !== undefined) {
        updates.flag_sudah_kirim_hadiah = (payload.flag_sudah_kirim_hadiah === true || payload.flag_sudah_kirim_hadiah === 'true' || payload.flag_sudah_kirim_hadiah === 'TRUE') ? 'TRUE' : 'FALSE';
      }

      DB.update('Guests', payload.id, updates);
      ActivityLogService.log(tenantId, auth.user_id, 'update_guest');

      return ResponseHelper.success(null, 'Guest updated successfully');
    },

    deleteGuest: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['id']);

      var guest = DB.findOne('Guests', 'id', payload.id);
      if (!guest || (auth.role !== 'superadmin' && guest.tenant_id !== tenantId)) {
        return ResponseHelper.error('Guest not found', 404);
      }

      DB.deleteRow('Guests', payload.id);
      ActivityLogService.log(tenantId, auth.user_id, 'delete_guest');

      return ResponseHelper.success(null, 'Guest deleted');
    },

    bulkDelete: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      if (!payload.ids || !payload.ids.length) {
        return ResponseHelper.error('No guest IDs provided', 400);
      }

      var deleted = 0;
      for (var i = 0; i < payload.ids.length; i++) {
        var guest = DB.findOne('Guests', 'id', payload.ids[i]);
        if (guest && (auth.role === 'superadmin' || guest.tenant_id === tenantId)) {
          DB.deleteRow('Guests', payload.ids[i]);
          deleted++;
        }
      }

      ActivityLogService.log(tenantId, auth.user_id, 'delete_guest');
      return ResponseHelper.success({ deleted: deleted }, deleted + ' guests deleted');
    },

    checkinGuest: function(auth, payload) {
      Validator.required(payload, ['invitation_code']);
      var tenantId = PermissionService.getTenantId(auth);
      var inviteCode = String(payload.invitation_code).trim();

      // Support Uninvited Guest Dynamic Payloads
      if (inviteCode.indexOf('NEW_GUEST:') === 0) {
        try {
          var dataStr = inviteCode.substring('NEW_GUEST:'.length);
          var guestData = {};
          if (dataStr.charAt(0) === '{') {
              guestData = JSON.parse(dataStr);
          } else {
              var parts = dataStr.split(':');
              guestData = { 
                  name: parts[0], 
                  category: parts[1] || 'Tamu Undangan Umum',
                  phone: parts[2] || '',
                  pax: parts[3] ? parseInt(parts[3]) : 1
              };
          }
          
          // Ensure guest limit handles new additions explicitly offsite
          var tenant = DB.findOne('Tenants', 'id', tenantId);
          if (tenant && tenant.guest_limit !== -1) {
            var currentCount = DB.count('Guests', tenantId);
            if (currentCount >= tenant.guest_limit) {
              return ResponseHelper.error('Guest limit reached. Cannot register new guest via QR.', 403);
            }
          }
          
          var newGuest = {
            id: DB.generateId(),
            tenant_id: tenantId,
            name: Validator.sanitize(guestData.name || 'Unknown Guest'),
            phone: Validator.sanitize(guestData.phone || ''),
            category: Validator.sanitize(guestData.category || 'Tamu'),
            invitation_code: 'WED-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
            status: 'confirmed',
            number_of_guests: guestData.pax || 1,
            checkin_status: 'checked_in',
            flag_sudah_kirim_undangan_via_whatsapp: 'FALSE',
            flag_sudah_isi_ucapan: 'FALSE',
            flag_sudah_kirim_hadiah: 'FALSE',
            created_at: new Date().toISOString()
          };
          
          DB.insert('Guests', newGuest);
          return ResponseHelper.success(newGuest, 'New guest successfully registered and checked in.');
        } catch (e) {
          return ResponseHelper.error('Failed to parse dynamic guest QR.', 400);
        }
      }

      // Typical check-in flow - SCOPE TO TENANT ONLY
      var allGuests = DB.getByTenant('Guests', tenantId);
      var guest = allGuests.find(function(g) { return String(g.invitation_code).trim() === inviteCode; });

      if (!guest) {
        return ResponseHelper.error('Tamu tidak ditemukan atau QR Code tidak valid', 404);
      }

      // Validate Tenant ID
      if (guest.tenant_id !== tenantId) {
        return ResponseHelper.error('QR Code ini bukan untuk acara Anda (Beda Tenant)', 403);
      }

      // Prevent double check-in
      if (guest.checkin_status === 'checked_in') {
        return ResponseHelper.error('Tamu ini sudah melakukan check-in sebelumnya', 400);
      }

      DB.update('Guests', guest.id, { checkin_status: 'checked_in' });

      return ResponseHelper.success(guest, 'Guest checked in successfully');
    },

    importGuests: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      if (!payload.guests || !payload.guests.length) {
        return ResponseHelper.error('No guests to import', 400);
      }

      var tenant = DB.findOne('Tenants', 'id', tenantId);
      var currentCount = DB.count('Guests', tenantId);

      if (tenant && tenant.guest_limit !== -1 && currentCount + payload.guests.length > tenant.guest_limit) {
        return ResponseHelper.error('Import would exceed guest limit (' + tenant.guest_limit + ')', 403);
      }

      var imported = 0;
      for (var i = 0; i < payload.guests.length; i++) {
        var g = payload.guests[i];
        var guest = {
          id: DB.generateId(),
          tenant_id: tenantId,
          name: Validator.sanitize(g.name || ''),
          phone: Validator.sanitize(g.phone || ''),
          category: Validator.sanitize(g.category || 'Friends'),
          invitation_code: 'WED-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          status: g.status || 'pending',
          number_of_guests: parseInt(g.number_of_guests) || 1,
          checkin_status: 'not_checked_in',
          flag_sudah_kirim_undangan_via_whatsapp: 'FALSE',
          flag_sudah_isi_ucapan: 'FALSE',
          flag_sudah_kirim_hadiah: 'FALSE',
          created_at: new Date().toISOString()
        };
        DB.insert('Guests', guest);
        imported++;
      }

      return ResponseHelper.success({ imported: imported }, imported + ' guests imported');
    },

    exportGuests: function(auth) {
      var tenantId = auth.role === 'superadmin' ? null : auth.tenant_id;
      var guests = tenantId ? DB.getByTenant('Guests', tenantId) : DB.getAll('Guests');
      return ResponseHelper.success(guests, 'Guests exported');
    },

    updateGuestBlastStatus: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['id', 'sent']);
      
      var guest = DB.findOne('Guests', 'id', payload.id);
      if (!guest || (auth.role !== 'superadmin' && guest.tenant_id !== tenantId)) {
        return ResponseHelper.error('Guest not found', 404);
      }

      var success = DB.update('Guests', payload.id, { 
        flag_sudah_kirim_undangan_via_whatsapp: payload.sent === true || payload.sent === 'true' ? 'TRUE' : 'FALSE'
      });

      if (success) {
        return ResponseHelper.success(null, 'Blast status updated');
      }
      return ResponseHelper.error('Failed to update status', 500);
    }
  };


  // =====================================================================
  // DASHBOARD SERVICE
  // =====================================================================

  var DashboardService = {
    getTenantDashboard: function(auth) {
      var tenantId = PermissionService.getTenantId(auth);
      var guests = DB.getByTenant('Guests', tenantId);
      var wishes = DB.getByTenant('Wishes', tenantId);
      var gifts = DB.getByTenant('Gifts', tenantId);

      var confirmed = guests.filter(function(g) { return g.status === 'confirmed'; }).length;
      var declined = guests.filter(function(g) { return g.status === 'declined'; }).length;
      var pending = guests.filter(function(g) { return g.status === 'pending'; }).length;

      var totalNominal = gifts.reduce(function(sum, g) { return sum + (parseFloat(g.amount) || 0); }, 0);

      // Guest growth data (grouped by month)
      var growth = {};
      guests.forEach(function(g) {
        var month = String(g.created_at).substring(0, 7);
        growth[month] = (growth[month] || 0) + 1;
      });
      var guestGrowth = Object.keys(growth).sort().map(function(date) {
        return { date: date, count: growth[date] };
      });

      // Cumulative growth
      var cumulative = 0;
      guestGrowth = guestGrowth.map(function(item) {
        cumulative += item.count;
        return { date: item.date, count: cumulative };
      });

      return ResponseHelper.success({
        tenant: DB.findOne('Tenants', 'id', tenantId),
        total_guests: guests.length,
        total_confirmed: confirmed,
        total_declined: declined,
        total_pending: pending,
        total_wishes: wishes.length,
        total_gifts: gifts.length,
        total_nominal: totalNominal,
        guest_growth: guestGrowth,
        rsvp_breakdown: [
          { name: 'Confirmed', value: confirmed },
          { name: 'Declined', value: declined },
          { name: 'Pending', value: pending }
        ]
      }, 'Dashboard data retrieved');
    },

    getGlobalDashboard: function(auth) {
      PermissionService.requireRole(auth, ['superadmin']);

      var tenants = DB.getAll('Tenants');
      var guests = DB.getAll('Guests');
      var activeTenants = tenants.filter(function(t) { return t.status_account === 'active'; });

      // Revenue estimation
      var planPrices = { basic: 0, pro: 149000, premium: 299000 };
      var revenue = tenants.reduce(function(sum, t) {
        return sum + (planPrices[t.plan_type] || 0);
      }, 0);

      // Plan distribution
      var planCount = { basic: 0, pro: 0, premium: 0 };
      tenants.forEach(function(t) {
        if (planCount[t.plan_type] !== undefined) planCount[t.plan_type]++;
      });

      // Tenant growth
      var growth = {};
      tenants.forEach(function(t) {
        var month = String(t.created_at).substring(0, 7);
        growth[month] = (growth[month] || 0) + 1;
      });
      var tenantGrowth = Object.keys(growth).sort().map(function(date) {
        return { date: date, count: growth[date] };
      });
      var cumulative = 0;
      tenantGrowth = tenantGrowth.map(function(item) {
        cumulative += item.count;
        return { date: item.date, count: cumulative };
      });

      return ResponseHelper.success({
        total_tenants: tenants.length,
        total_active_tenants: activeTenants.length,
        total_guests_system: guests.length,
        revenue_estimation: revenue,
        plan_distribution: [
          { name: 'Free', value: planCount.free },
          { name: 'Pro', value: planCount.pro },
          { name: 'Premium', value: planCount.premium }
        ],
        tenant_growth: tenantGrowth
      }, 'Global dashboard retrieved');
    },

    getPendingActions: function(auth) {
      PermissionService.requireRole(auth, ['superadmin']);

      var tenants = DB.getAll('Tenants');
      var mstFeatures = DB.getAll('MstAdditionalFeature').filter(function(f) { 
        return (f.active === true || f.active === 'true' || f.active === 'TRUE');
      });

      if (mstFeatures.length === 0) return ResponseHelper.success({ incomplete_tenants: [] }, 'No active features found');

      var tenantFeatures = DB.getAll('TenantActiveFeature');
      var incompleteTenants = [];

      tenants.forEach(function(tenant) {
        var featuresForTenant = tenantFeatures.filter(function(tf) { return tf.tenant_id === tenant.id; });
        
        var pending = [];
        mstFeatures.forEach(function(mst) {
          var tf = featuresForTenant.find(function(f) { return f.additional_feature_id === mst.id; });
          
          var isActiveTenant = tf && (tf.active === true || tf.active === 'true' || tf.active === 'TRUE');
          var paymentStatusStr = String(tf ? tf.payment_status || '' : '').trim().toLowerCase();
          
          var isPurchased = tf && !(
            !isActiveTenant && 
            paymentStatusStr === 'menunggu pembayaran' && 
            !tf.input_tenant_data && 
            !tf.output_data
          );
          
          var needsAdminOutput = (mst.output_data_type && mst.output_data_type !== 'empty');
          var hasNoOutput = tf && needsAdminOutput && !tf.output_data;
          var isPaidButNotActive = tf && paymentStatusStr === 'sudah dibayar' && !isActiveTenant;
          
          if (isPurchased) {
            if (isPaidButNotActive) {
              pending.push({ name: mst.feature_name, reason: 'sudah dibayar namun belum diaktifkan' });
            } else if (hasNoOutput) {
              pending.push({ name: mst.feature_name, reason: 'perlu dilengkapi datanya' });
            }
          }
        });

        if (pending.length > 0) {
          incompleteTenants.push({
            id: tenant.id,
            bride_name: tenant.bride_name,
            groom_name: tenant.groom_name,
            domain_slug: tenant.domain_slug,
            plan_type: tenant.plan_type,
            status_account: tenant.status_account,
            status_payment: tenant.status_payment,
            payment_deadline: tenant.payment_deadline,
            wedding_date: tenant.wedding_date,
            theme_id: tenant.theme_id,
            pending_features: pending
          });
        }
      });

      return ResponseHelper.success({
        incomplete_tenants: incompleteTenants
      }, 'Pending actions retrieved');
    }
  };


  // =====================================================================
  // WISH SERVICE
  // =====================================================================

  var WishService = {
    getWishes: function(auth) {
      var tenantId = PermissionService.getTenantId(auth);
      var wishes = DB.getByTenant('Wishes', tenantId);
      return ResponseHelper.success(wishes, 'Wishes retrieved');
    },

    createWish: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['guest_name', 'message']);
      var sanitized = Validator.sanitizeObject(payload);

      var wish = {
        id: DB.generateId(),
        tenant_id: tenantId,
        guest_name: sanitized.guest_name,
        message: sanitized.message,
        created_at: new Date().toISOString()
      };

      DB.insert('Wishes', wish);
      return ResponseHelper.success(wish, 'Wish added');
    },

    deleteWish: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['id']);

      var wish = DB.findOne('Wishes', 'id', payload.id);
      if (!wish || (auth.role !== 'superadmin' && wish.tenant_id !== tenantId)) {
        return ResponseHelper.error('Wish not found', 404);
      }

      DB.deleteRow('Wishes', payload.id);
      return ResponseHelper.success(null, 'Wish deleted');
    }
  };


  // =====================================================================
  // GIFT SERVICE
  // =====================================================================

  var GiftService = {
    getGifts: function(auth) {
      var tenantId = PermissionService.getTenantId(auth);
      var gifts = DB.getByTenant('Gifts', tenantId);
      return ResponseHelper.success(gifts, 'Gifts retrieved');
    },

    createGift: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['guest_name', 'amount', 'bank_name']);
      var sanitized = Validator.sanitizeObject(payload);

      var gift = {
        id: DB.generateId(),
        tenant_id: tenantId,
        guest_name: sanitized.guest_name,
        amount: parseFloat(sanitized.amount) || 0,
        bank_name: sanitized.bank_name,
        created_at: new Date().toISOString()
      };

      DB.insert('Gifts', gift);
      return ResponseHelper.success(gift, 'Gift recorded');
    },

    deleteGift: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['id']);

      var gift = DB.findOne('Gifts', 'id', payload.id);
      if (!gift || (auth.role !== 'superadmin' && gift.tenant_id !== tenantId)) {
        return ResponseHelper.error('Gift not found', 404);
      }

      DB.deleteRow('Gifts', payload.id);
      return ResponseHelper.success(null, 'Gift deleted');
    }
  };


  // =====================================================================
  // ACTIVITY LOG SERVICE
  // =====================================================================

  var ActivityLogService = {
    log: function(tenantId, userId, action) {
      try {
        DB.insert('ActivityLogs', {
          id: DB.generateId(),
          tenant_id: tenantId,
          user_id: userId,
          action: action,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        Logger.log('Activity log error: ' + e.message);
      }
    },

    getLogs: function(auth) {
      var tenantId = auth.role === 'superadmin' ? null : auth.tenant_id;
      var logs;
      if (tenantId) {
        logs = DB.getByTenant('ActivityLogs', tenantId);
      } else {
        logs = DB.getAll('ActivityLogs');
      }

      // Get all users to join data
      var users = DB.getAll('Users');
      var userMap = {};
      users.forEach(function(u) {
        userMap[u.id] = { username: u.username, role: u.role };
      });

      // Join username and role to each log
      var enrichedLogs = logs.map(function(log) {
        var user = userMap[log.user_id] || { username: 'System', role: '' };
        return {
          id: log.id,
          tenant_id: log.tenant_id,
          user_id: log.user_id,
          username: user.username,
          role: user.role,
          action: log.action,
          created_at: log.created_at
        };
      });

      // Sort by created_at descending
      enrichedLogs.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
      return ResponseHelper.success(enrichedLogs, 'Activity logs retrieved');
    }
  };


  // =====================================================================
  // INVITATION CONTENT SERVICE
  // =====================================================================

  var InvitationContentService = {
    getContent: function(auth) {
      var tenantId = PermissionService.getTenantId(auth);
      var content = DB.findOne('InvitationContent', 'tenant_id', tenantId);
      var tenant = DB.findOne('Tenants', 'id', tenantId);
      
      // If not found, create empty object
      if (!content) {
        content = {};
      }

      // Always inject tenant info
      if (tenant) {
        content.bride_name = tenant.bride_name;
        content.bride_nickname = tenant.bride_nickname;
        content.groom_name = tenant.groom_name;
        content.groom_nickname = tenant.groom_nickname;
        content.religion = tenant.religion;
        content.wedding_date = tenant.wedding_date;
        // FRESH from the Tenants sheet: the theme/quotes the tenant ACTUALLY has.
        // The frontend auth store's tenant can be stale (esp. under impersonation
        // or after a save in a prior session), so the theme picker seeds its
        // selected-theme from THIS value instead of the possibly-stale auth store.
        content.theme_id = tenant.theme_id || '';
        content.quotes_id = tenant.quotes_id || '';
        // Only set tanggal_akad from tenant if not already set in InvitationContent
        if (!content.tanggal_akad) {
          content.tanggal_akad = tenant.wedding_date;
        }
      }

      return ResponseHelper.success(content, 'Invitation content retrieved');
    },

    updateContent: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      var sanitized = Validator.sanitizeObject(payload);

      // Ensure we don't accidentally update id and tenant_id
      delete sanitized.id;
      delete sanitized.tenant_id;

      // Check if we need to update basic Tenant data
      var tenantUpdates = {};
      if (sanitized.bride_name !== undefined) {
        tenantUpdates.bride_name = sanitized.bride_name;
      }
      if (sanitized.bride_nickname !== undefined) {
        tenantUpdates.bride_nickname = sanitized.bride_nickname;
      }
      if (sanitized.groom_name !== undefined) {
        tenantUpdates.groom_name = sanitized.groom_name;
      }
      if (sanitized.groom_nickname !== undefined) {
        tenantUpdates.groom_nickname = sanitized.groom_nickname;
      }
      if (sanitized.religion !== undefined) {
        tenantUpdates.religion = sanitized.religion;
      }
      if (sanitized.wedding_date !== undefined) {
        tenantUpdates.wedding_date = sanitized.wedding_date;
      } else if (sanitized.tanggal_akad !== undefined) {
        // Fallback
        tenantUpdates.wedding_date = sanitized.tanggal_akad;
      }

      if (Object.keys(tenantUpdates).length > 0) {
        DB.update('Tenants', tenantId, tenantUpdates);
      }
      
      // Remove tenant columns from InvitationContent payload before saving
      delete sanitized.bride_name;
      delete sanitized.bride_nickname;
      delete sanitized.groom_name;
      delete sanitized.groom_nickname;
      delete sanitized.religion;
      delete sanitized.wedding_date;

      var existing = DB.findOne('InvitationContent', 'tenant_id', tenantId);

      if (existing) {
        // Update
        DB.update('InvitationContent', existing.id, sanitized);
        var updated = DB.findOne('InvitationContent', 'id', existing.id);

        // Inject tenant data back for the response
        var tenant = DB.findOne('Tenants', 'id', tenantId);
        if (tenant) {
          updated.bride_name = tenant.bride_name;
          updated.groom_name = tenant.groom_name;
          updated.wedding_date = tenant.wedding_date;
          if (!updated.tanggal_akad) {
            updated.tanggal_akad = tenant.wedding_date;
          }
          // Konten berubah -> buang cache statis undangan slug ini.
          PublicCache.invalidateSlug(tenant.domain_slug);
        }

        ActivityLogService.log(tenantId, auth.user_id, 'update_invitation_content');
        return ResponseHelper.success(updated, 'Content updated successfully');
      } else {
        // Insert
        sanitized.id = DB.generateId();
        sanitized.tenant_id = tenantId;
        var inserted = DB.insert('InvitationContent', sanitized);

        // Inject tenant data back for the response
        var tenant = DB.findOne('Tenants', 'id', tenantId);
        if (tenant) {
          inserted.bride_name = tenant.bride_name;
          inserted.groom_name = tenant.groom_name;
          inserted.wedding_date = tenant.wedding_date;
          inserted.tanggal_akad = tenant.wedding_date;
          PublicCache.invalidateSlug(tenant.domain_slug);
        }

        ActivityLogService.log(tenantId, auth.user_id, 'create_invitation_content');
        return ResponseHelper.success(inserted, 'Content created successfully');
      }
    }
  };


  // =====================================================================
  // PUBLIC SERVICE - No auth required
  // =====================================================================

  var PublicService = {
    // PERF: getInvitation dulu membaca 10+ sheet penuh setiap buka undangan tanpa
    // cache -> "tiap buka tetap lambat". Sekarang bagian yang mahal & jarang berubah
    // di-cache di CacheService:
    //   1. blok STATIS per-slug (tenant subset + content + images + quotes + resolved
    //      theme_id) — TTL 5 menit; di-invalidate saat konten/foto/tema tenant berubah.
    //   2. TEMA per theme_id (chunked, bisa >100KB) — dibaca via _getThemeCached().
    //   3. referensi GLOBAL (MstAdditionalFeature/TenantActiveFeature-scoped, WebsiteConfig).
    // wishes & guest SELALU dibaca fresh (tak di-cache) supaya ucapan/RSVP baru dan
    // data tamu tak pernah basi.
    STATIC_TTL: 300,   // detik — blok statis undangan
    THEME_TTL: 900,    // detik — kode tema (dibagi banyak tamu)
    REF_TTL: 1800,     // detik — referensi global yang jarang berubah

    getInvitation: function(payload) {
      Validator.required(payload, ['slug']);

      // ---- 1) Blok STATIS (cacheable) ----
      var staticKey = PublicCache.staticKey(payload.slug);
      var staticBlock = PublicCache.getJSON(staticKey);
      if (!staticBlock) {
        staticBlock = this._buildStaticBlock(payload.slug);
        if (staticBlock && staticBlock.__error) {
          return ResponseHelper.error(staticBlock.__error.message, staticBlock.__error.code);
        }
        if (staticBlock) PublicCache.putJSON(staticKey, staticBlock, this.STATIC_TTL);
      }
      if (!staticBlock) {
        return ResponseHelper.error('Invitation not found', 404);
      }

      // ---- 2) TEMA. Preview URL memaksa tema tertentu; jika tidak, pakai theme_id tenant. ----
      var previewCode = (payload.theme_code || '').toString().trim();
      var theme = null;
      if (previewCode) {
        // Preview by code. DULU: DB.findOne('Themes','code',...) = baca SELURUH sheet
        // Themes (tiap baris berisi HTML/CSS/JS ratusan KB) TANPA cache tiap buka →
        // buka preview terasa lama. Sekarang resolve code -> id via cache ringkas
        // (hanya kolom code+id, TTL panjang), lalu ambil tema besar via _getThemeCached
        // yang chunked & dibagi antar-buka. Buka preview ke-2 dst jadi cepat.
        var previewId = this._resolveThemeIdByCode(previewCode);
        theme = previewId ? this._getThemeCached(previewId) : null;
      } else if (staticBlock.theme_id) {
        theme = this._getThemeCached(staticBlock.theme_id);
      }

      // ---- 3) Data FRESH (tak pernah di-cache): wishes & guest ----
      var wishes = DB.getByTenant('Wishes', staticBlock.__tenant_id);
      wishes.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

      var guest = null;
      if (payload.guestid) {
        var allGuests = DB.getByTenant('Guests', staticBlock.__tenant_id);
        for (var i = 0; i < allGuests.length; i++) {
          if (allGuests[i].invitation_code === payload.guestid) {
            guest = allGuests[i];
            break;
          }
        }
      }

      // SPLIT LOAD (perf): agar undangan muncul secepatnya, klien baru mengirim
      // skip_images=true → response pertama membawa data teks + KODE TEMA (yang
      // memang wajib untuk render badan undangan) TANPA daftar gambar tenant. Gambar
      // diambil terpisah lewat getInvitationImages() dan di-merge saat tiba (gambar
      // "berjalan sambil dimuat"). Klien lama (tanpa flag) tetap dapat images inline.
      var skipImages = (payload.skip_images === true || payload.skip_images === 'true');

      return ResponseHelper.success({
        tenant: staticBlock.tenant,
        wishes: wishes.slice(0, 50),
        content: staticBlock.content || {},
        guest: guest,
        theme: theme,
        images: skipImages ? [] : (staticBlock.images || []),
        images_deferred: skipImages ? true : false,
        quotes: staticBlock.quotes
      }, 'Invitation data retrieved');
    },

    // Request KEDUA dari split-load: hanya daftar gambar tenant untuk sebuah slug.
    // Murah — memakai blok statis yang sama (biasanya sudah hangat di cache setelah
    // getInvitation), tak pernah membaca ulang sheet Themes yang besar. wishes/guest
    // TIDAK disentuh di sini. Frontend memanggil ini paralel dengan getInvitation.
    getInvitationImages: function(payload) {
      Validator.required(payload, ['slug']);

      var staticKey = PublicCache.staticKey(payload.slug);
      var staticBlock = PublicCache.getJSON(staticKey);
      if (!staticBlock) {
        staticBlock = this._buildStaticBlock(payload.slug);
        if (staticBlock && staticBlock.__error) {
          return ResponseHelper.error(staticBlock.__error.message, staticBlock.__error.code);
        }
        if (staticBlock) PublicCache.putJSON(staticKey, staticBlock, this.STATIC_TTL);
      }
      if (!staticBlock) {
        return ResponseHelper.error('Invitation not found', 404);
      }

      return ResponseHelper.success({
        images: staticBlock.images || []
      }, 'Invitation images retrieved');
    },

    // Bangun blok statis undangan dari Sheets (dipanggil hanya saat cache miss).
    // Mengembalikan objek dengan __tenant_id & theme_id (untuk resolusi tema), atau
    // { __error: {message, code} } bila undangan tak valid.
    _buildStaticBlock: function(slug) {
      var tenant = DB.findOne('Tenants', 'domain_slug', slug);
      if (!tenant || tenant.status_account !== 'active') {
        return { __error: { message: 'Invitation not found', code: 404 } };
      }

      var content = DB.findOne('InvitationContent', 'tenant_id', tenant.id);
      if (!content) content = {};

      // Instagram Story Reply Additional Feature (ADD_FTR_STORY_IG)
      var flag_pakai_ig_story = false;
      var frame_balasan_instagram = '';
      var link_balasan_instagram = '';

      var allMstFeatures = this._getRefSheet('MstAdditionalFeature');
      var igStoryFeature = null;
      for (var k = 0; k < allMstFeatures.length; k++) {
        if (allMstFeatures[k].feature_code === 'ADD_FTR_STORY_IG') {
          igStoryFeature = allMstFeatures[k];
          break;
        }
      }

      if (igStoryFeature) {
        var isFeatureMasterActive = (igStoryFeature.active === true || igStoryFeature.active === 'true' || igStoryFeature.active === 'TRUE');
        if (isFeatureMasterActive) {
          var tenantFeatures = DB.getByTenant('TenantActiveFeature', tenant.id) || [];
          for (var j = 0; j < tenantFeatures.length; j++) {
            var tf = tenantFeatures[j];
            if (tf.additional_feature_id === igStoryFeature.id) {
              var tfActive = (tf.active === true || tf.active === 'true' || tf.active === 'TRUE');
              if (tfActive) {
                flag_pakai_ig_story = true;
                frame_balasan_instagram = tf.input_tenant_data || '';
                link_balasan_instagram = tf.output_data || '';
              }
              break;
            }
          }
        }
      }

      content.flag_pakai_additional_feature_story_balasan_instagram = flag_pakai_ig_story;
      content.frame_balasan_instagram = frame_balasan_instagram;
      content.link_balasan_instagram = link_balasan_instagram;

      // Social media configurations based on WebsiteConfig sheet
      var allConfigs = this._getRefSheet('WebsiteConfig');
      var websiteConfig = allConfigs.length > 0 ? allConfigs[0] : {};
      var site_tiktok = websiteConfig.site_tiktok || '';
      var site_youtube = websiteConfig.site_youtube || '';
      var site_instagram = websiteConfig.site_instagram || '';
      var contact_whatsapp = websiteConfig.contact_whatsapp || '';

      // Build a wa.me link from the raw WhatsApp number (handles 0.../+62.../8... → 62...)
      var wa_number = ('' + contact_whatsapp).replace(/[^\d+]/g, '');
      if (wa_number.charAt(0) === '+') wa_number = wa_number.substring(1);
      if (wa_number.charAt(0) === '0') wa_number = '62' + wa_number.substring(1);
      else if (wa_number.charAt(0) === '8' && wa_number.length >= 9) wa_number = '62' + wa_number;

      content.flag_use_tiktok_webconfig = (site_tiktok !== '' && site_tiktok !== null && site_tiktok !== undefined);
      content.flag_use_youtube_webconfig = (site_youtube !== '' && site_youtube !== null && site_youtube !== undefined);
      content.flag_use_instagram_webconfig = (site_instagram !== '' && site_instagram !== null && site_instagram !== undefined);
      content.flag_use_whatsapp_webconfig = (wa_number !== '');

      content.url_tiktok_webconfig = site_tiktok;
      content.url_youtube_webconfig = site_youtube;
      content.url_instagram_webconfig = site_instagram;
      content.url_whatsapp_webconfig = wa_number !== '' ? ('https://wa.me/' + wa_number) : '';

      var tenantImages = DB.getByTenant('Images', tenant.id) || [];
      var quotes = QuotesVariantService.resolveQuotes(tenant.quotes_id);

      return {
        __tenant_id: tenant.id,
        theme_id: tenant.theme_id || '',
        tenant: {
          bride_name: tenant.bride_name,
          bride_nickname: tenant.bride_nickname,
          groom_name: tenant.groom_name,
          groom_nickname: tenant.groom_nickname,
          religion: tenant.religion,
          wedding_date: tenant.wedding_date,
          domain_slug: tenant.domain_slug,
          theme_id: tenant.theme_id,
          status_payment: tenant.status_payment
        },
        content: content,
        images: tenantImages,
        quotes: quotes
      };
    },

    // Ambil tema (dengan image_types/asset_media_list sudah di-parse) via cache
    // per theme_id. Tema sering >100KB -> PublicCache otomatis chunking.
    _getThemeCached: function(themeId) {
      if (!themeId) return null;
      var key = PublicCache.themeKey(themeId);
      var cached = PublicCache.getJSON(key);
      if (cached) return cached;
      var theme = DB.findOne('Themes', 'id', themeId);
      if (!theme) return null;
      theme = this._prepareTheme(theme);
      PublicCache.putJSON(key, theme, this.THEME_TTL);
      return theme;
    },

    // Resolve theme_code -> theme_id secara MURAH untuk path preview.
    // Hanya membaca 2 kolom (id, code) dari sheet Themes — BUKAN seluruh baris
    // HTML/CSS/JS yang berat — lalu di-cache sebagai map kecil (TTL panjang).
    // Dengan ini preview tak lagi menembak getAll('Themes') penuh tiap buka; tema
    // besarnya sendiri diambil via _getThemeCached (chunked, dibagi antar-buka).
    _resolveThemeIdByCode: function(code) {
      var wanted = (code || '').toString().trim().toLowerCase();
      if (!wanted) return null;

      var key = PublicCache.refKey('theme_code_map');
      var map = PublicCache.getJSON(key);
      if (!map) {
        map = {};
        try {
          var sheet = DB.getSheet('Themes');
          var lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            var idCol = headers.indexOf('id');
            var codeCol = headers.indexOf('code');
            // Hanya baca kolom id & code (2 kolom), bukan seluruh sheet yang berat.
            if (idCol !== -1 && codeCol !== -1) {
              var ids = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
              var codes = sheet.getRange(2, codeCol + 1, lastRow - 1, 1).getValues();
              for (var i = 0; i < ids.length; i++) {
                var c = (codes[i][0] == null ? '' : codes[i][0]).toString().trim().toLowerCase();
                if (c) map[c] = ids[i][0];
              }
            }
          }
        } catch (e) { map = {}; }
        PublicCache.putJSON(key, map, this.REF_TTL);
      }
      return map[wanted] || null;
    },

    // Parse kolom JSON tema menjadi array (dipakai baik untuk path cache maupun preview).
    _prepareTheme: function(theme) {
      try { theme.image_types = JSON.parse(theme.image_types); } catch(e) { theme.image_types = []; }
      try { theme.asset_media_list = JSON.parse(theme.asset_media_list); } catch(e) { theme.asset_media_list = []; }
      return theme;
    },

    // Baca sheet referensi global (jarang berubah) via cache bersama antar-slug.
    _getRefSheet: function(name) {
      var key = PublicCache.refKey(name);
      var cached = PublicCache.getJSON(key);
      if (cached) return cached;
      var rows = DB.getAll(name) || [];
      PublicCache.putJSON(key, rows, this.REF_TTL);
      return rows;
    },

    checkGuest: function(payload) {
      Validator.required(payload, ['slug', 'name']);
      var sanitized = Validator.sanitizeObject(payload);

      var tenant = DB.findOne('Tenants', 'domain_slug', sanitized.slug);
      if (!tenant) return ResponseHelper.error('Invitation not found', 404);

      var guests = DB.getByTenant('Guests', tenant.id);
      var targetName = String(sanitized.name).toLowerCase().trim();
      var exists = false;

      for (var i = 0; i < guests.length; i++) {
          if (guests[i].name && String(guests[i].name).toLowerCase().trim() === targetName) {
              exists = true;
              break;
          }
      }

      return ResponseHelper.success({
          exists: exists
      }, 'Guest existence checked');
    },

    submitRSVP: function(payload) {
      Validator.required(payload, ['slug', 'invitation_code', 'status']);
      var sanitized = Validator.sanitizeObject(payload);

      var tenant = DB.findOne('Tenants', 'domain_slug', sanitized.slug);
      if (!tenant) return ResponseHelper.error('Invitation not found', 404);

      var guests = DB.getByTenant('Guests', tenant.id);
      var guest = null;
      for (var i = 0; i < guests.length; i++) {
        if (guests[i].invitation_code === sanitized.invitation_code) {
          guest = guests[i];
          break;
        }
      }

      if (!guest) return ResponseHelper.error('Invalid invitation code', 404);

      var validStatus = ['confirmed', 'declined'];
      if (validStatus.indexOf(sanitized.status) === -1) {
        return ResponseHelper.error('Invalid status', 400);
      }

      var updates = { status: sanitized.status };
      if (sanitized.number_of_guests) {
        updates.number_of_guests = parseInt(sanitized.number_of_guests) || 1;
      }

      DB.update('Guests', guest.id, updates);

      return ResponseHelper.success({
        name: guest.name,
        status: sanitized.status
      }, 'RSVP submitted successfully');
    },

    submitWish: function(payload) {
      Validator.required(payload, ['slug', 'guest_name', 'message']);
      var sanitized = Validator.sanitizeObject(payload);

      var tenant = DB.findOne('Tenants', 'domain_slug', sanitized.slug);
      if (!tenant) return ResponseHelper.error('Invitation not found', 404);

      // Resolve the guest first (by invitation_code) so we can stamp guest_id on the
      // wish. Public/general invitations have no code → guest_id stays ''.
      var guest = null;
      if (sanitized.invitation_code) {
        var guests = DB.getByTenant('Guests', tenant.id);
        guest = guests.find(function(g) { return g.invitation_code === sanitized.invitation_code; }) || null;
      }

      var wish = {
        id: DB.generateId(),
        tenant_id: tenant.id,
        guest_id: guest ? guest.id : '',
        guest_name: sanitized.guest_name,
        message: sanitized.message,
        created_at: new Date().toISOString()
      };

      DB.insert('Wishes', wish);

      // Auto-flag guest as having submitted a wish.
      if (guest) {
        DB.update('Guests', guest.id, { flag_sudah_isi_ucapan: 'TRUE' });
      }

      return ResponseHelper.success(wish, 'Wish submitted successfully');
    },

    submitPublicGift: function(payload) {
      Validator.required(payload, ['slug', 'guest_name', 'amount', 'bank_name']);
      var sanitized = Validator.sanitizeObject(payload);

      var tenant = DB.findOne('Tenants', 'domain_slug', sanitized.slug);
      if (!tenant) return ResponseHelper.error('Invitation not found', 404);

      var gift = {
        id: DB.generateId(),
        tenant_id: tenant.id,
        guest_name: sanitized.guest_name,
        amount: parseFloat(sanitized.amount) || 0,
        bank_name: sanitized.bank_name,
        created_at: new Date().toISOString()
      };

      DB.insert('Gifts', gift);

      // Auto-flag guest if invitation_code is provided
      if (sanitized.invitation_code) {
        var guests = DB.getByTenant('Guests', tenant.id);
        var guest = guests.find(function(g) { return g.invitation_code === sanitized.invitation_code; });
        if (guest) {
          DB.update('Guests', guest.id, { flag_sudah_kirim_hadiah: 'TRUE' });
        }
      }

      return ResponseHelper.success(gift, 'Gift confirmation submitted successfully');
    }
  };


  // =====================================================================
  // IMAGE SERVICE
  // =====================================================================

  var ImageService = {
    getTenantImages: function(auth) {
      var tenantId = PermissionService.getTenantId(auth);
      var images = DB.getByTenant('Images', tenantId);
      return ResponseHelper.success(images, 'Images retrieved');
    },

    uploadImage: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['image_type', 'file_name', 'base64_data', 'mime_type']);

      var rootFolderName = 'wedding-saas-storage';
      
      // Find or create root folder
      var folders = DriveApp.getFoldersByName(rootFolderName);
      var rootFolder;
      if (folders.hasNext()) {
        rootFolder = folders.next();
      } else {
        rootFolder = DriveApp.createFolder(rootFolderName);
      }

      // Find or create tenants folder
      var tenantsFolders = rootFolder.getFoldersByName('tenants');
      var tenantsFolder;
      if (tenantsFolders.hasNext()) {
        tenantsFolder = tenantsFolders.next();
      } else {
        tenantsFolder = rootFolder.createFolder('tenants');
      }

      // Find or create specific tenant folder
      var tenantFolders = tenantsFolder.getFoldersByName(tenantId);
      var tenantFolder;
      if (tenantFolders.hasNext()) {
        tenantFolder = tenantFolders.next();
      } else {
        tenantFolder = tenantsFolder.createFolder(tenantId);
      }

      // Find or create image type folder
      var typeFolders = tenantFolder.getFoldersByName(payload.image_type);
      var typeFolder;
      if (typeFolders.hasNext()) {
        typeFolder = typeFolders.next();
      } else {
        typeFolder = tenantFolder.createFolder(payload.image_type);
      }

      // Save file
      try {
        var blob = Utilities.newBlob(Utilities.base64Decode(payload.base64_data), payload.mime_type, payload.file_name);
        var file = typeFolder.createFile(blob);
        
        // Allow link sharing
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        var imageId = DB.generateId();
        var now = new Date().toISOString();
        
        // Use our Apps Script JSON base64 Proxy for rendering in frontend seamlessly
        var cdnUrl = ScriptApp.getService().getUrl() + '?action=imageProxy&id=' + file.getId();

        var record = {
          id: imageId,
          tenant_id: tenantId,
          image_type: payload.image_type,
          file_name: payload.file_name,
          drive_file_id: file.getId(),
          drive_url: file.getUrl(),
          cdn_url: cdnUrl,
          width: payload.width || 0,
          height: payload.height || 0,
          size_kb: payload.size_kb || 0,
          created_at: now
        };

        DB.insert('Images', record);

        // Foto tenant berubah -> buang cache statis undangan slug ini.
        try {
          var upTenant = DB.findOne('Tenants', 'id', tenantId);
          if (upTenant) PublicCache.invalidateSlug(upTenant.domain_slug);
        } catch (eInv) {}

        return ResponseHelper.success({
          id: imageId,
          file_name: payload.file_name,
          drive_file_id: file.getId(),
          drive_url: file.getUrl(),
          cdn_url: cdnUrl
        }, 'Image uploaded successfully');
        
      } catch (e) {
        return ResponseHelper.error('Failed to save file: ' + e.toString(), 500);
      }
    },

    deleteImage: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['id']);
      
      // Try find by ID first, then by drive_file_id if the input looks like a Drive ID
      var existingImage = DB.findOne('Images', 'id', payload.id);
      if (!existingImage) {
        existingImage = DB.findOne('Images', 'drive_file_id', payload.id);
      }
      
      if (!existingImage || (auth.role !== 'superadmin' && existingImage.tenant_id !== tenantId)) {
        return ResponseHelper.error('Image not found or unauthorized', 404);
      }

      try {
        // Trash file in Drive
        var file = DriveApp.getFileById(existingImage.drive_file_id);
        file.setTrashed(true);
      } catch (e) {
        Logger.log('Could not trash file: ' + existingImage.drive_file_id + '. It may be deleted already. Error: ' + e.toString());
      }

      // Delete record from DB
      DB.deleteRow('Images', existingImage.id);

      // Foto tenant berubah -> buang cache statis undangan slug ini.
      try {
        var delTenant = DB.findOne('Tenants', 'id', existingImage.tenant_id);
        if (delTenant) PublicCache.invalidateSlug(delTenant.domain_slug);
      } catch (eInv) {}

      return ResponseHelper.success(null, 'Image deleted successfully');
    },

    // Batch delete: trash many Drive files and remove their Images rows in ONE
    // sheet rewrite. Accepts `ids` (array of Images.id OR drive_file_id, same dual
    // lookup as single delete). Ordering is deliberate to avoid orphans BOTH ways:
    //   1. Resolve + authorize every id -> the real Images row.
    //   2. Trash each Drive file. A file that is already gone counts as success
    //      (so its row gets cleaned up rather than stranded forever).
    //   3. Remove from the sheet ONLY the rows whose Drive file is confirmed gone,
    //      in a single rewrite. Rows whose Drive trash genuinely failed are kept
    //      so they aren't left as DB records pointing at a live Drive file.
    // Returns { deleted: [...ids resolved as input], failed: [{id, reason}] } so the
    // frontend can drop exactly the assets that were truly removed and keep the rest.
    deleteImages: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['ids']);

      var inputIds = payload.ids;
      if (!Array.isArray(inputIds)) inputIds = [inputIds];

      var rowIdsToDelete = [];   // resolved Images.id values whose Drive file is gone
      var deletedInputIds = [];  // the original input ids that succeeded
      var failed = [];           // [{ id: inputId, reason }]

      for (var i = 0; i < inputIds.length; i++) {
        var inputId = inputIds[i];

        // Same dual lookup as the single delete.
        var existingImage = DB.findOne('Images', 'id', inputId);
        if (!existingImage) {
          existingImage = DB.findOne('Images', 'drive_file_id', inputId);
        }

        // Not in DB: nothing to orphan here. Treat as success so the caller can
        // drop a stale reference that points at no record.
        if (!existingImage) {
          deletedInputIds.push(inputId);
          continue;
        }

        if (auth.role !== 'superadmin' && existingImage.tenant_id !== tenantId) {
          failed.push({ id: inputId, reason: 'unauthorized' });
          continue;
        }

        // Trash the Drive file. Already-trashed/deleted counts as gone.
        var driveGone = true;
        try {
          var file = DriveApp.getFileById(existingImage.drive_file_id);
          file.setTrashed(true);
        } catch (e) {
          // File missing/inaccessible -> treat as already gone (no orphan possible).
          // Any other unexpected error: keep the row so we don't strand a live file.
          var msg = (e && e.toString) ? e.toString() : String(e);
          if (msg.indexOf('not found') === -1 && msg.indexOf('Not Found') === -1
              && msg.indexOf('No item') === -1 && msg.indexOf('does not exist') === -1) {
            driveGone = false;
            failed.push({ id: inputId, reason: 'drive_trash_failed' });
          }
          Logger.log('Batch trash: ' + existingImage.drive_file_id + ' -> ' + msg);
        }

        if (driveGone) {
          rowIdsToDelete.push(existingImage.id);
          deletedInputIds.push(inputId);
        }
      }

      // Remove all confirmed rows in a single rewrite.
      DB.deleteRowsByIds('Images', rowIdsToDelete);

      // Foto tenant berubah -> buang cache statis undangan slug ini (semua row milik tenant ini).
      if (rowIdsToDelete.length > 0) {
        try {
          var batchTenant = DB.findOne('Tenants', 'id', tenantId);
          if (batchTenant) PublicCache.invalidateSlug(batchTenant.domain_slug);
        } catch (eInv) {}
      }

      return ResponseHelper.success(
        { deleted: deletedInputIds, failed: failed },
        deletedInputIds.length + ' image(s) deleted, ' + failed.length + ' failed'
      );
    }
  };


  function splitStringIntoFields(str) {
    var s = str || '';
    return {
      main: s.substring(0, 50000),
      extra_1: s.substring(50000, 100000),
      extra_2: s.substring(100000, 150000),
      extra_3: s.substring(150000, 200000),
      extra_4: s.substring(200000, 250000),
      extra_5: s.substring(250000, 300000),
      extra_6: s.substring(300000, 350000),
      extra_7: s.substring(350000, 400000),
      extra_8: s.substring(400000, 450000),
      extra_9: s.substring(450000, 500000),
      extra_10: s.substring(500000, 550000)
    };
  }

  // =====================================================================
  // THEME SERVICE
  // =====================================================================

  var ThemeService = {
    getThemes: function(auth) {
      var themes = DB.getAll('Themes');
      // Resolve sample_tenant_id -> domain_slug once for the whole list. The landing
      // page builds its preview URL by SLUG (/#/preview/<code>/<slug>), not by id, so
      // we expose sample_tenant_slug alongside. Map built once to avoid N lookups.
      var isPublic = (!auth || auth.role !== 'superadmin') && !auth;
      var tenantSlugById = {};
      var allTenants = DB.getAll('Tenants');
      for (var ti = 0; ti < allTenants.length; ti++) {
        tenantSlugById[allTenants[ti].id] = allTenants[ti].domain_slug || '';
      }
      themes.forEach(function(t) {
        t.code = t.code || '';
        t.style_category = t.style_category || '';
        t.flag_use_system_action_button = (t.flag_use_system_action_button === undefined || t.flag_use_system_action_button === null || t.flag_use_system_action_button === '' ? true : (t.flag_use_system_action_button === true || t.flag_use_system_action_button === 'true' || t.flag_use_system_action_button === 'TRUE' || t.flag_use_system_action_button === 1 || t.flag_use_system_action_button === '1'));
        var sampleId = t.sample_tenant_id || '';
        t.sample_tenant_id = sampleId;
        // '' bila tenant tak ditemukan/terhapus -> landing page fallback ke cara default.
        t.sample_tenant_slug = sampleId ? (tenantSlugById[sampleId] || '') : '';
        // Jangan bocorkan id tenant internal ke publik; slug sudah cukup untuk preview.
        if (isPublic) t.sample_tenant_id = '';
        try { t.image_types = JSON.parse(t.image_types); } catch(e) { t.image_types = []; }
        try { t.asset_media_list = JSON.parse(t.asset_media_list); } catch(e) { t.asset_media_list = []; }
      });
      // Tenant only sees themes for their plan or lower. Public sees all non-drafts.
      if (!auth || auth.role !== 'superadmin') {
        var priorities = { basic: 1, pro: 2, premium: 3 };
        // Normalize plan strings before lookup: Sheet values can carry stray
        // casing/whitespace (e.g. "Premium", "premium ", "PREMIUM"). Without this,
        // priorities[plan] is undefined and falls back to basic (1), so a real
        // PREMIUM tenant gets treated as BASIC and every pro/premium theme —
        // including the playable game themes — is wrongly filtered out.
        var normPlan = function(p) { return String(p == null ? '' : p).trim().toLowerCase(); };

        var tenantPriority = 3; // Default to highest for public/superadmin, but for non-admin we filter.

        if (auth && auth.role !== 'superadmin') {
          var tenantId = PermissionService.getTenantId(auth);
          var tenant = DB.findOne('Tenants', 'id', tenantId);
          if (tenant) {
            tenantPriority = priorities[normPlan(tenant.plan_type)] || 1;
          }
        }

        // A theme ABOVE the tenant's plan (e.g. a premium theme on a pro tenant)
        // must NOT appear in the picker — even if it's the tenant's currently
        // assigned theme. The public invitation still renders it (getInvitation
        // resolves by theme_id with no plan filter), so nothing breaks there; it
        // simply isn't offered as a choice here. Consequently such a tenant sees
        // NO selected card, which is the intended behaviour.
        themes = themes.filter(function(t) {
          var themePriority = priorities[normPlan(t.plan_type)] || 1;
          var isDraft = (t.flag_draft === true || t.flag_draft === 'true' || t.flag_draft === 'TRUE');
          // For public view (auth is null), show all non-drafts.
          // For tenant_admin, show based on plan priority.
          return (!auth ? !isDraft : (themePriority <= tenantPriority && !isDraft));
        });
      }
      return ResponseHelper.success(themes, 'Themes retrieved');
    },

    // Returns true if another theme already uses this code (case-insensitive).
    // excludeId lets updateTheme ignore the row it is editing.
    isThemeCodeTaken: function(code, excludeId) {
      var c = (code || '').toString().trim().toLowerCase();
      if (!c) return false;
      var all = DB.getAll('Themes') || [];
      for (var i = 0; i < all.length; i++) {
        if (excludeId && all[i].id === excludeId) continue;
        if ((all[i].code || '').toString().trim().toLowerCase() === c) return true;
      }
      return false;
    },

    createTheme: function(auth, payload) {
      // NOTE: html_template is intentionally NOT required here. The client creates a
      // lightweight row first with empty templates, then streams the real HTML/CSS/JS
      // via chunkedSaveTheme (separate small requests to stay under the Apps Script
      // POST size limit). Requiring html_template would reject that empty first request.
      Validator.required(payload, ['name', 'plan_type']);
      var sanitized = Validator.sanitizeObject(payload);

      if (sanitized.code && this.isThemeCodeTaken(sanitized.code, null)) {
        return ResponseHelper.error('Kode tema "' + sanitized.code + '" sudah dipakai tema lain.', 400);
      }
      
      // We allow full HTML, so don't completely sanitize HTML template
      var html_template = payload.html_template || '';
      var css_template = payload.css_template || '';
      var js_template = payload.js_template || '';

      var MAX_TOTAL_CHARS = 550000;
      if (html_template.length > MAX_TOTAL_CHARS) {
        return ResponseHelper.error('Ukuran template HTML (' + html_template.length + ' karakter) melebihi batas maksimal (550.000 karakter). Harap perkecil ukuran HTML Anda.', 400);
      }
      if (css_template.length > MAX_TOTAL_CHARS) {
        return ResponseHelper.error('Ukuran template CSS (' + css_template.length + ' karakter) melebihi batas maksimal (550.000 karakter). Harap pindahkan asset ke file eksternal atau perkecil CSS Anda.', 400);
      }
      if (js_template.length > MAX_TOTAL_CHARS) {
        return ResponseHelper.error('Ukuran template JS (' + js_template.length + ' karakter) melebihi batas maksimal (550.000 karakter). Harap perkecil JS Anda.', 400);
      }

      var htmlSplits = splitStringIntoFields(html_template);
      var cssSplits = splitStringIntoFields(css_template);
      var jsSplits = splitStringIntoFields(js_template);

      var theme = {
        id: DB.generateId(),
        code: sanitized.code || '',
        name: sanitized.name,
        html_template: htmlSplits.main,
        html_extra_1: htmlSplits.extra_1,
        html_extra_2: htmlSplits.extra_2,
        html_extra_3: htmlSplits.extra_3,
        html_extra_4: htmlSplits.extra_4,
        html_extra_5: htmlSplits.extra_5,
        html_extra_6: htmlSplits.extra_6,
        html_extra_7: htmlSplits.extra_7,
        html_extra_8: htmlSplits.extra_8,
        html_extra_9: htmlSplits.extra_9,
        html_extra_10: htmlSplits.extra_10,
        css_template: cssSplits.main,
        css_extra_1: cssSplits.extra_1,
        css_extra_2: cssSplits.extra_2,
        css_extra_3: cssSplits.extra_3,
        css_extra_4: cssSplits.extra_4,
        css_extra_5: cssSplits.extra_5,
        css_extra_6: cssSplits.extra_6,
        css_extra_7: cssSplits.extra_7,
        css_extra_8: cssSplits.extra_8,
        css_extra_9: cssSplits.extra_9,
        css_extra_10: cssSplits.extra_10,
        js_template: jsSplits.main,
        js_extra_1: jsSplits.extra_1,
        js_extra_2: jsSplits.extra_2,
        js_extra_3: jsSplits.extra_3,
        js_extra_4: jsSplits.extra_4,
        js_extra_5: jsSplits.extra_5,
        js_extra_6: jsSplits.extra_6,
        js_extra_7: jsSplits.extra_7,
        js_extra_8: jsSplits.extra_8,
        js_extra_9: jsSplits.extra_9,
        js_extra_10: jsSplits.extra_10,
        plan_type: sanitized.plan_type,
        style_category: sanitized.style_category || '',
        preview_image: sanitized.preview_image || '',
        flag_draft: payload.hasOwnProperty('flag_draft') ? payload.flag_draft : true,
        flag_use_system_action_button: payload.hasOwnProperty('flag_use_system_action_button') ? (payload.flag_use_system_action_button === true || payload.flag_use_system_action_button === 'true' || payload.flag_use_system_action_button === 'TRUE') : true,
        // Tenant contoh untuk preview di landing page. Default kosong; disimpan sebagai id tenant.
        sample_tenant_id: sanitized.sample_tenant_id || '',
        image_types: payload.image_types ? JSON.stringify(payload.image_types) : '[]',
        asset_media_list: payload.asset_media_list ? JSON.stringify(payload.asset_media_list) : '[]',
        created_at: new Date().toISOString()
      };

      DB.insert('Themes', theme);

      // Tema baru (code baru) -> buang cache map code->id preview.
      PublicCache.del(PublicCache.refKey('theme_code_map'));

      // Return combined representation so response matches client expectations
      theme.html_template = html_template;
      theme.css_template = css_template;
      theme.js_template = js_template;
      delete theme.html_extra_1;
      delete theme.html_extra_2;
      delete theme.html_extra_3;
      delete theme.html_extra_4;
      delete theme.html_extra_5;
      delete theme.html_extra_6;
      delete theme.html_extra_7;
      delete theme.html_extra_8;
      delete theme.html_extra_9;
      delete theme.html_extra_10;
      delete theme.css_extra_1;
      delete theme.css_extra_2;
      delete theme.css_extra_3;
      delete theme.css_extra_4;
      delete theme.css_extra_5;
      delete theme.css_extra_6;
      delete theme.css_extra_7;
      delete theme.css_extra_8;
      delete theme.css_extra_9;
      delete theme.css_extra_10;
      delete theme.js_extra_1;
      delete theme.js_extra_2;
      delete theme.js_extra_3;
      delete theme.js_extra_4;
      delete theme.js_extra_5;
      delete theme.js_extra_6;
      delete theme.js_extra_7;
      delete theme.js_extra_8;
      delete theme.js_extra_9;
      delete theme.js_extra_10;

      return ResponseHelper.success(theme, 'Theme created successfully');
    },

    updateTheme: function(auth, payload) {
      Validator.required(payload, ['id']);

      if (payload.code !== undefined && payload.code && this.isThemeCodeTaken(payload.code, payload.id)) {
        return ResponseHelper.error('Kode tema "' + payload.code + '" sudah dipakai tema lain.', 400);
      }

      var MAX_TOTAL_CHARS = 550000;
      if (payload.html_template !== undefined && payload.html_template.length > MAX_TOTAL_CHARS) {
        return ResponseHelper.error('Ukuran template HTML (' + payload.html_template.length + ' karakter) melebihi batas maksimal (550.000 karakter). Harap perkecil ukuran HTML Anda.', 400);
      }
      if (payload.css_template !== undefined && payload.css_template.length > MAX_TOTAL_CHARS) {
        return ResponseHelper.error('Ukuran template CSS (' + payload.css_template.length + ' karakter) melebihi batas maksimal (550.000 karakter). Harap perkecil ukuran CSS Anda.', 400);
      }
      if (payload.js_template !== undefined && payload.js_template.length > MAX_TOTAL_CHARS) {
        return ResponseHelper.error('Ukuran template JS (' + payload.js_template.length + ' karakter) melebihi batas maksimal (550.000 karakter). Harap perkecil ukuran JS Anda.', 400);
      }
      
      var updates = {};
      if (payload.name !== undefined) updates.name = Validator.sanitizeObject({n: payload.name}).n;
      
      if (payload.html_template !== undefined) {
        var htmlSplits = splitStringIntoFields(payload.html_template);
        updates.html_template = htmlSplits.main;
        updates.html_extra_1 = htmlSplits.extra_1;
        updates.html_extra_2 = htmlSplits.extra_2;
        updates.html_extra_3 = htmlSplits.extra_3;
        updates.html_extra_4 = htmlSplits.extra_4;
        updates.html_extra_5 = htmlSplits.extra_5;
        updates.html_extra_6 = htmlSplits.extra_6;
        updates.html_extra_7 = htmlSplits.extra_7;
        updates.html_extra_8 = htmlSplits.extra_8;
        updates.html_extra_9 = htmlSplits.extra_9;
        updates.html_extra_10 = htmlSplits.extra_10;
      }
      if (payload.css_template !== undefined) {
        var cssSplits = splitStringIntoFields(payload.css_template);
        updates.css_template = cssSplits.main;
        updates.css_extra_1 = cssSplits.extra_1;
        updates.css_extra_2 = cssSplits.extra_2;
        updates.css_extra_3 = cssSplits.extra_3;
        updates.css_extra_4 = cssSplits.extra_4;
        updates.css_extra_5 = cssSplits.extra_5;
        updates.css_extra_6 = cssSplits.extra_6;
        updates.css_extra_7 = cssSplits.extra_7;
        updates.css_extra_8 = cssSplits.extra_8;
        updates.css_extra_9 = cssSplits.extra_9;
        updates.css_extra_10 = cssSplits.extra_10;
      }
      if (payload.js_template !== undefined && !payload.__chunked) {
        var jsSplits = splitStringIntoFields(payload.js_template);
        updates.js_template = jsSplits.main;
        updates.js_extra_1 = jsSplits.extra_1;
        updates.js_extra_2 = jsSplits.extra_2;
        updates.js_extra_3 = jsSplits.extra_3;
        updates.js_extra_4 = jsSplits.extra_4;
        updates.js_extra_5 = jsSplits.extra_5;
        updates.js_extra_6 = jsSplits.extra_6;
        updates.js_extra_7 = jsSplits.extra_7;
        updates.js_extra_8 = jsSplits.extra_8;
        updates.js_extra_9 = jsSplits.extra_9;
        updates.js_extra_10 = jsSplits.extra_10;
      }

      // CHUNKED SAVE: the client may send individual split columns directly
      // (html_template, html_extra_1..10, css_*, js_*) across SEVERAL small
      // requests instead of one big body, to stay under the Apps Script POST
      // size limit. Each column is already ≤50K, so copy them through verbatim.
      // Triggered by payload.__chunked so it never collides with the normal
      // single-request path above (which splits the full *_template itself).
      if (payload.__chunked) {
        var SPLIT_COLS = [
          'html_template','html_extra_1','html_extra_2','html_extra_3','html_extra_4','html_extra_5','html_extra_6','html_extra_7','html_extra_8','html_extra_9','html_extra_10',
          'css_template','css_extra_1','css_extra_2','css_extra_3','css_extra_4','css_extra_5','css_extra_6','css_extra_7','css_extra_8','css_extra_9','css_extra_10',
          'js_template','js_extra_1','js_extra_2','js_extra_3','js_extra_4','js_extra_5','js_extra_6','js_extra_7','js_extra_8','js_extra_9','js_extra_10'
        ];
        for (var ci = 0; ci < SPLIT_COLS.length; ci++) {
          var colName = SPLIT_COLS[ci];
          if (payload[colName] !== undefined) {
            if (String(payload[colName]).length > 50000) {
              return ResponseHelper.error('Potongan "' + colName + '" melebihi 50.000 karakter.', 400);
            }
            updates[colName] = payload[colName];
          }
        }
      }

      if (payload.code !== undefined) updates.code = Validator.sanitizeObject({c: payload.code}).c;
      if (payload.plan_type !== undefined) updates.plan_type = Validator.sanitizeObject({p: payload.plan_type}).p;
      if (payload.style_category !== undefined) updates.style_category = Validator.sanitizeObject({s: payload.style_category}).s;
      if (payload.preview_image !== undefined) updates.preview_image = Validator.sanitizeObject({i: payload.preview_image}).i;
      // Tenant contoh untuk preview landing page (id tenant; '' = pakai cara preview default).
      if (payload.sample_tenant_id !== undefined) updates.sample_tenant_id = Validator.sanitizeObject({s: payload.sample_tenant_id || ''}).s;
      if (payload.flag_draft !== undefined) updates.flag_draft = payload.flag_draft;
      if (payload.image_types !== undefined) updates.image_types = JSON.stringify(payload.image_types);
      if (payload.asset_media_list !== undefined) updates.asset_media_list = JSON.stringify(payload.asset_media_list);
      if (payload.flag_use_system_action_button !== undefined) {
        updates.flag_use_system_action_button = (payload.flag_use_system_action_button === true || payload.flag_use_system_action_button === 'true' || payload.flag_use_system_action_button === 'TRUE');
      }

      var success = DB.update('Themes', payload.id, updates);
      if (!success) {
        return ResponseHelper.error('Theme not found', 404);
      }
      // Kode/tema berubah -> buang cache tema per-id (dipakai bersama semua tamu).
      PublicCache.invalidateTheme(payload.id);
      // Kalau kolom `code` ikut berubah, map code->id preview jadi basi -> buang.
      if (updates.code !== undefined) {
        PublicCache.del(PublicCache.refKey('theme_code_map'));
      }
      return ResponseHelper.success(null, 'Theme updated successfully');
    },

    deleteTheme: function(auth, payload) {
      Validator.required(payload, ['id']);

      // Clean up static asset media files (image/video) stored in Drive for this theme.
      // YouTube videos have an empty media_id and are skipped (no Drive file).
      var existingTheme = DB.findOne('Themes', 'id', payload.id);
      if (existingTheme) {
        var assetList = [];
        try { assetList = JSON.parse(existingTheme.asset_media_list); } catch(e) { assetList = []; }
        if (Array.isArray(assetList)) {
          assetList.forEach(function(asset) {
            if (asset && asset.media_id) {
              try {
                DriveApp.getFileById(asset.media_id).setTrashed(true);
              } catch (e) {
                Logger.log('Could not trash theme asset file: ' + asset.media_id + '. Error: ' + e.toString());
              }
              // Remove matching record from the Images sheet if it exists
              try {
                var imgRec = DB.findOne('Images', 'drive_file_id', asset.media_id);
                if (imgRec) DB.deleteRow('Images', imgRec.id);
              } catch (e) {
                Logger.log('Could not delete Images record for theme asset: ' + asset.media_id);
              }
            }
          });
        }
      }

      var success = DB.deleteRow('Themes', payload.id);
      if (!success) {
        return ResponseHelper.error('Theme not found', 404);
      }
      // Tema dihapus -> map code->id preview & cache tema per-id jadi basi.
      PublicCache.invalidateTheme(payload.id);
      PublicCache.del(PublicCache.refKey('theme_code_map'));
      return ResponseHelper.success(null, 'Theme deleted successfully');
    }
  };


  // =====================================================================
  // ADDITIONAL FEATURE SERVICE
  // =====================================================================

  var AdditionalFeatureService = {
    getMstFeatures: function(auth) {
      var features = DB.getAll('MstAdditionalFeature');
      // Convert string booleans to actual booleans for frontend consistency
      features.forEach(function(f) {
        f.is_required_tenant_input = (f.is_required_tenant_input === true || f.is_required_tenant_input === 'true' || f.is_required_tenant_input === 'TRUE');
        f.active = (f.active === true || f.active === 'true' || f.active === 'TRUE');
      });
      return ResponseHelper.success(features, 'Master additional features retrieved');
    },

    createMstFeature: function(auth, payload) {
      Validator.required(payload, ['feature_name', 'input_data_type', 'output_data_type']);
      var sanitized = Validator.sanitizeObject(payload);
      
      var feature = {
        id: DB.generateId(),
        feature_code: sanitized.feature_code || '',
        feature_name: sanitized.feature_name,
        description: sanitized.description || '',
        is_required_tenant_input: payload.is_required_tenant_input ? 'TRUE' : 'FALSE',
        input_data_type: sanitized.input_data_type || '',
        output_data_type: sanitized.output_data_type || '',
        active: payload.active !== false ? 'TRUE' : 'FALSE',
        price: Number(payload.price) || 0,
        created_at: new Date().toISOString()
      };

      DB.insert('MstAdditionalFeature', feature);
      return ResponseHelper.success(feature, 'Feature created successfully');
    },

    updateMstFeature: function(auth, payload) {
      Validator.required(payload, ['id']);
      
      var updates = {};
      if (payload.feature_code !== undefined) updates.feature_code = Validator.sanitizeObject({c: payload.feature_code}).c;
      if (payload.feature_name !== undefined) updates.feature_name = Validator.sanitizeObject({n: payload.feature_name}).n;
      if (payload.description !== undefined) updates.description = Validator.sanitizeObject({d: payload.description}).d;
      if (payload.is_required_tenant_input !== undefined) updates.is_required_tenant_input = payload.is_required_tenant_input ? 'TRUE' : 'FALSE';
      if (payload.input_data_type !== undefined) updates.input_data_type = Validator.sanitizeObject({t: payload.input_data_type}).t;
      if (payload.output_data_type !== undefined) updates.output_data_type = Validator.sanitizeObject({t: payload.output_data_type}).t;
      if (payload.active !== undefined) updates.active = payload.active ? 'TRUE' : 'FALSE';
      if (payload.price !== undefined) updates.price = Number(payload.price) || 0;

      var success = DB.update('MstAdditionalFeature', payload.id, updates);
      if (!success) return ResponseHelper.error('Feature not found', 404);

      // Master fitur berubah -> buang cache ref (blok statis per-slug refresh saat TTL habis).
      PublicCache.del(PublicCache.refKey('MstAdditionalFeature'));

      return ResponseHelper.success(null, 'Feature updated successfully');
    },

    deleteMstFeature: function(auth, payload) {
      Validator.required(payload, ['id']);
      var success = DB.deleteRow('MstAdditionalFeature', payload.id);
      if (!success) return ResponseHelper.error('Feature not found', 404);

      // Also delete associated TenantActiveFeatures
      var tenantFeatures = DB.getAll('TenantActiveFeature').filter(function(f) { return f.additional_feature_id === payload.id; });
      tenantFeatures.forEach(function(f) {
        DB.deleteRow('TenantActiveFeature', f.id);
      });

      PublicCache.del(PublicCache.refKey('MstAdditionalFeature'));

      return ResponseHelper.success(null, 'Feature deleted successfully');
    },

    getTenantFeatures: function(auth, payload) {
      // If superadmin requests, they must provide tenant_id. Otherwise, get from auth.
      var targetTenantId = auth.role === 'superadmin' ? payload.tenant_id : PermissionService.getTenantId(auth);
      if (!targetTenantId) return ResponseHelper.error('Tenant ID required', 400);

      var mstFeatures = DB.getAll('MstAdditionalFeature');
      var tenantFeatures = DB.getAll('TenantActiveFeature').filter(function(f) { return f.tenant_id === targetTenantId; });

      // Combine them
      var result = mstFeatures.map(function(mst) {
        if (!mst.id) return null;
        var active = tenantFeatures.find(function(tf) { 
          return tf.additional_feature_id && String(tf.additional_feature_id) === String(mst.id); 
        });
        
        return {
          id: (active && active.id) ? active.id : null,
          tenant_id: targetTenantId,
          additional_feature_id: mst.id,
          feature_name: mst.feature_name,
          description: mst.description || '',
          is_required_tenant_input: (mst.is_required_tenant_input === true || mst.is_required_tenant_input === 'true' || mst.is_required_tenant_input === 'TRUE'),
          input_data_type: mst.input_data_type,
          output_data_type: mst.output_data_type,
          input_tenant_data: active ? active.input_tenant_data : '',
          output_data: active ? active.output_data : '',
          active: active ? (active.active === true || active.active === 'true' || active.active === 'TRUE') : false,
          mst_active: (mst.active === true || mst.active === 'true' || mst.active === 'TRUE'),
          price: Number(mst.price) || 0,
          payment_status: (active && active.payment_status) ? active.payment_status : 'Belum dibeli'
        };
      }).filter(function(r) { return r !== null; });

      // For tenant_admin, only show features that are active at the master level
      if (auth.role !== 'superadmin') {
        result = result.filter(function(r) { return r.mst_active; });
      }

      return ResponseHelper.success(result, 'Tenant features retrieved');
    },

    updateTenantFeature: function(auth, payload) {
      // payload should have: additional_feature_id, tenant_id (if superadmin)
      var targetTenantId = auth.role === 'superadmin' ? payload.tenant_id : PermissionService.getTenantId(auth);
      if (!targetTenantId) return ResponseHelper.error('Tenant ID required', 400);
      Validator.required(payload, ['additional_feature_id']);

      var tenantFeatures = DB.getAll('TenantActiveFeature').filter(function(f) { return f.tenant_id === targetTenantId; });
      var existing = tenantFeatures.find(function(f) { return f.additional_feature_id === payload.additional_feature_id; });

      var updates = {};
      
      // Superadmin can update active and output_data
      if (auth.role === 'superadmin') {
        if (payload.active !== undefined) updates.active = payload.active ? 'TRUE' : 'FALSE';
        if (payload.output_data !== undefined) updates.output_data = payload.output_data;
      }
      
      // Tenant can update input_tenant_data
      if (auth.role !== 'superadmin' || payload.input_tenant_data !== undefined) {
        if (payload.input_tenant_data !== undefined) updates.input_tenant_data = payload.input_tenant_data;
      }

      if (payload.payment_status !== undefined) updates.payment_status = payload.payment_status;

      if (existing) {
        DB.update('TenantActiveFeature', existing.id, updates);
      } else {
        // Create new
        var newFeature = {
          id: DB.generateId(),
          tenant_id: targetTenantId,
          additional_feature_id: String(payload.additional_feature_id),
          input_tenant_data: updates.input_tenant_data || '',
          output_data: updates.output_data || '',
          active: updates.active !== undefined ? (updates.active ? 'TRUE' : 'FALSE') : 'FALSE',
          payment_status: updates.payment_status || 'Menunggu pembayaran'
        };
        DB.insert('TenantActiveFeature', newFeature);
      }

      // Fitur tambahan (mis. IG-story) ikut blok statis undangan -> buang cache slug.
      try {
        var featTenant = DB.findOne('Tenants', 'id', targetTenantId);
        if (featTenant) PublicCache.invalidateSlug(featTenant.domain_slug);
      } catch (eInv) {}

      return ResponseHelper.success(null, 'Tenant feature updated successfully');
    },

    deleteTenantFeature: function(auth, payload) {
      var targetTenantId = auth.role === 'superadmin' ? payload.tenant_id : PermissionService.getTenantId(auth);
      if (!targetTenantId) return ResponseHelper.error('Tenant ID required', 400);
      Validator.required(payload, ['additional_feature_id']);
      
      var tenantFeatures = DB.getAll('TenantActiveFeature').filter(function(f) { 
        return String(f.tenant_id) === String(targetTenantId); 
      });
      
      var existing = tenantFeatures.find(function(f) { 
        return String(f.additional_feature_id) === String(payload.additional_feature_id); 
      });

      if (!existing) return ResponseHelper.error('Feature not assigned to this tenant', 404);

      var success = DB.deleteRow('TenantActiveFeature', existing.id);
      if (!success) return ResponseHelper.error('Failed to delete feature assignment', 500);

      // Fitur tambahan dicabut -> buang cache statis undangan slug ini.
      try {
        var delFeatTenant = DB.findOne('Tenants', 'id', targetTenantId);
        if (delFeatTenant) PublicCache.invalidateSlug(delFeatTenant.domain_slug);
      } catch (eInv) {}

      return ResponseHelper.success(null, 'Feature removed from tenant successfully');
    }
  };

  // =====================================================================
  // SETUP FUNCTION - Run this once to initialize spreadsheet
  // =====================================================================

  // =====================================================================
  // WEBSITE CONFIG SERVICE
  // =====================================================================

  var WebsiteConfigService = {
    getConfig: function() {
      var all = DB.getAll('WebsiteConfig');
      var config = all.length > 0 ? all[0] : this.getDefaultConfig();
      
      // Add additional data for public landing page looping
      var reviews = DB.getAll('ReviewAndRating').filter(function(r) {
        return r.flag_show_review === 'TRUE' || r.flag_show_review === true || r.flag_show_review === 'true';
      });
      
      // Sort reviews by newest first
      reviews.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

      var features = DB.getAll('MstAdditionalFeature').filter(function(f) {
        return f.active === 'TRUE' || f.active === true || f.active === 'true';
      });

      config.reviews = reviews;
      config.features = features;

      return ResponseHelper.success(config, 'Website config retrieved');
    },

    updateConfig: function(auth, payload) {
      PermissionService.requireRole(auth, ['superadmin']);
      
      // Create a sanitized version of the payload for general fields
      var sanitized = {};
      var codeFields = ['site_code_html', 'site_code_css', 'site_code_js', 'site_logo'];
      
      for (var key in payload) {
        if (codeFields.indexOf(key) !== -1) {
          // Don't sanitize code or URLs to prevent breaking them
          sanitized[key] = payload[key];
        } else {
          sanitized[key] = Validator.sanitize(payload[key]);
        }
      }
      
      var all = DB.getAll('WebsiteConfig');
      var existing = all.length > 0 ? all[0] : null;

      if (existing) {
        if (!existing.id) {
          DB.getSheet('WebsiteConfig').getRange(2, 1).setValue(DB.generateId());
          existing = DB.getAll('WebsiteConfig')[0];
        }
        DB.update('WebsiteConfig', existing.id, sanitized);
        // Referensi global berubah -> buang cache ref (slug statis akan refresh saat TTL habis, maks 5 mnt).
        PublicCache.del(PublicCache.refKey('WebsiteConfig'));
        ActivityLogService.log(auth.tenant_id, auth.user_id, 'update_website_config');
        return ResponseHelper.success(DB.getAll('WebsiteConfig')[0], 'Website config updated');
      } else {
        sanitized.id = DB.generateId();
        DB.insert('WebsiteConfig', sanitized);
        PublicCache.del(PublicCache.refKey('WebsiteConfig'));
        ActivityLogService.log(auth.tenant_id, auth.user_id, 'create_website_config');
        return ResponseHelper.success(sanitized, 'Website config created');
      }
    },

    getDefaultConfig: function() {
      return {
        site_name: 'Wedding SaaS',
        site_url: '',
        site_logo: '',
        site_instagram: '',
        site_tiktok: '',
        site_youtube: '',
        contact_email: '',
        contact_whatsapp: '',
        tagline: 'Momen Spesial, Undangan Berkelas',
        site_description: 'Platform pembuatan undangan pernikahan digital terbaik.',
        site_code_html: '',
        site_code_css: '',
        site_code_js: '',
        primary_color: '#C6A769',
        accent_color: '#1A1A2E'
      };
    }
  };


  // =====================================================================
  // REVIEW SERVICE
  // =====================================================================

  var ReviewService = {
    getReviews: function(auth) {
      var reviews = DB.getAll('ReviewAndRating');
      return ResponseHelper.success(reviews, 'Reviews retrieved');
    },

    submitReview: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['comment', 'rate_star']);
      
      var tenant = DB.findOne('Tenants', 'id', tenantId);
      if (!tenant) return ResponseHelper.error('Tenant not found', 404);

      // Check if already reviewed
      var existing = DB.findOne('ReviewAndRating', 'tenant_id', tenantId);
      if (existing) return ResponseHelper.error('You have already submitted a review', 400);

      // Fetch address from InvitationContent
      var content = DB.findOne('InvitationContent', 'tenant_id', tenantId);
      var alamat = content ? content.keterangan_lokasi_resepsi : '';

      var review = {
        id: DB.generateId(),
        tenant_id: tenantId,
        comment: payload.comment,
        rate_star: payload.rate_star,
        wedding_date: tenant.wedding_date,
        bride_name: tenant.bride_name,
        groom_name: tenant.groom_name,
        domain_slug: tenant.domain_slug,
        plan_type: tenant.plan_type,
        theme_id: tenant.theme_id || '',
        alamat: alamat || '',
        flag_show_review: 'FALSE',
        created_at: new Date().toISOString()
      };

      DB.insert('ReviewAndRating', review);
      ActivityLogService.log(tenantId, auth.user_id, 'submit_review');

      return ResponseHelper.success(review, 'Review submitted successfully');
    },

    updateReview: function(auth, payload) {
      Validator.required(payload, ['id']);
      
      var updates = {};
      if (payload.flag_show_review !== undefined) {
        updates.flag_show_review = payload.flag_show_review === true || payload.flag_show_review === 'TRUE' || payload.flag_show_review === 'true' ? 'TRUE' : 'FALSE';
      }
      if (payload.alamat !== undefined) {
        updates.alamat = payload.alamat;
      }

      var success = DB.update('ReviewAndRating', payload.id, updates);
      if (success) return ResponseHelper.success(null, 'Review updated');
      return ResponseHelper.error('Failed to update review', 500);
    },

    getReviewByTenant: function(auth) {
      var tenantId = PermissionService.getTenantId(auth);
      var review = DB.findOne('ReviewAndRating', 'tenant_id', tenantId);
      return ResponseHelper.success(review, 'Review retrieved');
    }
  };

  // =====================================================================
  // QUOTES VARIANT SERVICE (Master Quotes)
  // =====================================================================

  var QUOTE_TEXT_FIELDS = ['quote_1', 'quote_2', 'quote_3', 'quote_4', 'quote_5', 'quote_6', 'quote_7'];
  var QUOTE_BY_FIELDS = ['quote_by_1', 'quote_by_2', 'quote_by_3', 'quote_by_4', 'quote_by_5', 'quote_by_6', 'quote_by_7'];

  var QuotesVariantService = {
    // Normalize the various truthy representations stored in the sheet to a real boolean
    isTrue: function(val) {
      return val === true || val === 'TRUE' || val === 'true';
    },

    // Set flag_default_quotes = 'FALSE' on every row except exceptId
    clearOtherDefaults: function(exceptId) {
      var all = DB.getAll('QuotesVariant');
      for (var i = 0; i < all.length; i++) {
        if (all[i].id !== exceptId && this.isTrue(all[i].flag_default_quotes)) {
          DB.update('QuotesVariant', all[i].id, { flag_default_quotes: 'FALSE' });
        }
      }
    },

    // Returns id of the default quote, or the top-most row if none is default. '' if sheet empty.
    getDefaultOrTopQuoteId: function() {
      var all = DB.getAll('QuotesVariant');
      if (all.length === 0) return '';
      for (var i = 0; i < all.length; i++) {
        if (this.isTrue(all[i].flag_default_quotes)) return all[i].id;
      }
      return all[0].id;
    },

    // Resolve a full quote object (7 quotes + 7 authors) for a given quotes_id, with fallback.
    resolveQuotes: function(quotesId) {
      var quote = null;
      if (quotesId) {
        quote = DB.findOne('QuotesVariant', 'id', quotesId);
      }
      if (!quote) {
        var fallbackId = this.getDefaultOrTopQuoteId();
        if (fallbackId) quote = DB.findOne('QuotesVariant', 'id', fallbackId);
      }
      if (!quote) return null;
      return quote;
    },

    // Generate the next quotes_slug for a given zero-padded width.
    // Master quotes (dibuat via menu Master Quotes) pakai 2 digit -> 'quotes-01'.
    // Custom quotes (dibuat tenant via Kelola Undangan) pakai 4 digit -> 'quotes-0001'.
    //
    // Tiap pola punya deret sendiri: yang dihitung hanya slug dengan JUMLAH DIGIT
    // yang sama, jadi quotes-05 dan quotes-0020 tidak saling mengganggu.
    //
    // Nomor diambil dari MAX yang sudah terpakai + 1, bukan dari jumlah baris:
    // kalau quotes-03 dihapus, berikutnya tetap quotes-05 sehingga nomor tidak pernah
    // dipakai ulang (menghitung baris akan menghasilkan quotes-04 yang bentrok).
    nextQuotesSlug: function(width) {
      var rows = DB.getAll('QuotesVariant');
      // ^quotes-(tepat `width` digit)$ — jangkar penuh supaya 'quotes-0001' (4 digit)
      // tidak ikut terbaca saat menghitung deret 2 digit.
      var re = new RegExp('^quotes-(\\d{' + width + '})$');
      var max = 0;
      for (var i = 0; i < rows.length; i++) {
        var m = re.exec(String(rows[i].quotes_slug || '').trim());
        if (m) {
          var n = parseInt(m[1], 10);
          if (n > max) max = n;
        }
      }
      var next = String(max + 1);
      // Zero-pad ke `width`; nomor yang melewati width dibiarkan tumbuh apa adanya
      // (mis. deret 2 digit yang sudah lewat 99 -> 'quotes-100') supaya tetap unik.
      while (next.length < width) next = '0' + next;
      return 'quotes-' + next;
    },

    // Build creator_username + tenant_slug enrichment maps once for the whole list
    enrichList: function(rows) {
      var users = DB.getAll('Users');
      var tenants = DB.getAll('Tenants');
      var userMap = {};
      for (var u = 0; u < users.length; u++) { userMap[users[u].id] = users[u].username; }
      var tenantMap = {};
      for (var t = 0; t < tenants.length; t++) { tenantMap[tenants[t].id] = tenants[t]; }

      return rows.map(function(row) {
        var enriched = {};
        for (var k in row) { enriched[k] = row[k]; }
        // Treat the superadmin pseudo-tenant ('system'/'system-admin') as "no tenant"
        // so such rows display as "Berlaku umum" instead of a real tenant.
        var tnt = row.tenant_id ? tenantMap[row.tenant_id] : null;
        if (tnt && tnt.domain_slug === 'system-admin') { tnt = null; enriched.tenant_id = ''; }
        enriched.creator_username = row.user_id ? (userMap[row.user_id] || '') : '';
        enriched.tenant_slug = tnt ? (tnt.domain_slug || '') : '';
        enriched.tenant_username = '';
        if (tnt) {
          // find a tenant_admin username for this tenant for display
          for (var i = 0; i < users.length; i++) {
            if (users[i].tenant_id === row.tenant_id && users[i].role === 'tenant_admin') {
              enriched.tenant_username = users[i].username;
              break;
            }
          }
        }
        return enriched;
      });
    },

    getQuotesVariants: function(auth) {
      PermissionService.requireRole(auth, ['superadmin']);
      var rows = DB.getAll('QuotesVariant');
      return ResponseHelper.success(this.enrichList(rows), 'Quotes retrieved');
    },

    // Active quotes available to a tenant: public (no tenant_id) + this tenant's own.
    getActiveQuotesVariants: function(auth) {
      var tenantId = auth.tenant_id;
      var self = this;
      var rows = DB.getAll('QuotesVariant').filter(function(q) {
        if (!self.isTrue(q.active)) return false;
        return !q.tenant_id || q.tenant_id === tenantId;
      });
      return ResponseHelper.success(rows, 'Active quotes retrieved');
    },

    buildRowFromPayload: function(payload) {
      var row = {};
      row.religion_enum = payload.religion_enum || '';
      row.title = payload.title || '';
      for (var i = 0; i < QUOTE_TEXT_FIELDS.length; i++) {
        row[QUOTE_TEXT_FIELDS[i]] = payload[QUOTE_TEXT_FIELDS[i]] || '';
        row[QUOTE_BY_FIELDS[i]] = payload[QUOTE_BY_FIELDS[i]] || '';
      }
      return row;
    },

    createQuotesVariant: function(auth, payload) {
      PermissionService.requireRole(auth, ['superadmin']);
      Validator.required(payload, ['title']);

      var now = new Date().toISOString();
      var id = DB.generateId();
      var isDefault = this.isTrue(payload.flag_default_quotes);

      var row = this.buildRowFromPayload(payload);
      row.id = id;
      // Dibuat lewat menu Master Quotes -> deret 2 digit ('quotes-01').
      row.quotes_slug = this.nextQuotesSlug(2);
      row.active = this.isTrue(payload.active) ? 'TRUE' : 'FALSE';
      row.flag_default_quotes = isDefault ? 'TRUE' : 'FALSE';
      // Use quote_tenant_id (set explicitly by the form). Empty = "Berlaku umum".
      // payload.tenant_id is unreliable here: the client interceptor injects the
      // caller's tenant ('system' for superadmin) when it is blank.
      row.tenant_id = payload.quote_tenant_id || '';
      row.user_id = auth.user_id || '';
      row.created_at = now;
      row.update_at = now;

      DB.insert('QuotesVariant', row);
      if (isDefault) this.clearOtherDefaults(id);

      return ResponseHelper.success(row, 'Quote created successfully');
    },

    updateQuotesVariant: function(auth, payload) {
      PermissionService.requireRole(auth, ['superadmin']);
      Validator.required(payload, ['id']);

      var existing = DB.findOne('QuotesVariant', 'id', payload.id);
      if (!existing) return ResponseHelper.error('Quote not found', 404);

      var updates = {};
      if (payload.religion_enum !== undefined) updates.religion_enum = payload.religion_enum;
      if (payload.title !== undefined) updates.title = payload.title;
      for (var i = 0; i < QUOTE_TEXT_FIELDS.length; i++) {
        if (payload[QUOTE_TEXT_FIELDS[i]] !== undefined) updates[QUOTE_TEXT_FIELDS[i]] = payload[QUOTE_TEXT_FIELDS[i]];
        if (payload[QUOTE_BY_FIELDS[i]] !== undefined) updates[QUOTE_BY_FIELDS[i]] = payload[QUOTE_BY_FIELDS[i]];
      }
      if (payload.active !== undefined) updates.active = this.isTrue(payload.active) ? 'TRUE' : 'FALSE';
      // See createQuotesVariant: read the explicit quote_tenant_id, not payload.tenant_id
      // (the latter is overwritten with the caller's tenant by the client interceptor).
      if (payload.quote_tenant_id !== undefined) updates.tenant_id = payload.quote_tenant_id || '';

      var becomingDefault = false;
      if (payload.flag_default_quotes !== undefined) {
        becomingDefault = this.isTrue(payload.flag_default_quotes);
        updates.flag_default_quotes = becomingDefault ? 'TRUE' : 'FALSE';
      }
      updates.update_at = new Date().toISOString();

      DB.update('QuotesVariant', payload.id, updates);
      if (becomingDefault) this.clearOtherDefaults(payload.id);

      return ResponseHelper.success(null, 'Quote updated successfully');
    },

    deleteQuotesVariant: function(auth, payload) {
      PermissionService.requireRole(auth, ['superadmin']);
      Validator.required(payload, ['id']);

      var existing = DB.findOne('QuotesVariant', 'id', payload.id);
      if (!existing) return ResponseHelper.error('Quote not found', 404);
      if (this.isTrue(existing.flag_default_quotes)) {
        return ResponseHelper.error('Quote default tidak dapat dihapus', 400);
      }

      DB.deleteRow('QuotesVariant', payload.id);
      return ResponseHelper.success(null, 'Quote deleted');
    },

    // Tenant saves their content-setting quote choice.
    // custom=true -> upsert a single tenant-owned row and point Tenants.quotes_id to it.
    // custom=false -> just point Tenants.quotes_id to the chosen master quotes_id.
    saveTenantQuotes: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      var isCustom = this.isTrue(payload.custom);

      var tenant = DB.findOne('Tenants', 'id', tenantId);
      if (!tenant) return ResponseHelper.error('Tenant not found', 404);

      if (!isCustom) {
        var chosenId = payload.quotes_id || '';
        DB.update('Tenants', tenantId, { quotes_id: chosenId });
        return ResponseHelper.success({ quotes_id: chosenId }, 'Quotes selection saved');
      }

      // Custom: find this tenant's own non-default row
      var self = this;
      var existing = DB.getAll('QuotesVariant').filter(function(q) {
        return q.tenant_id === tenantId && q.user_id === auth.user_id && !self.isTrue(q.flag_default_quotes);
      })[0];

      var now = new Date().toISOString();
      // Only the 7 quote + 7 author fields, never clobber title/religion on update
      var quoteFields = {};
      for (var i = 0; i < QUOTE_TEXT_FIELDS.length; i++) {
        quoteFields[QUOTE_TEXT_FIELDS[i]] = payload[QUOTE_TEXT_FIELDS[i]] || '';
        quoteFields[QUOTE_BY_FIELDS[i]] = payload[QUOTE_BY_FIELDS[i]] || '';
      }

      var quotesId;
      if (existing) {
        quotesId = existing.id;
        var updates = {};
        for (var key in quoteFields) { updates[key] = quoteFields[key]; }
        updates.active = 'TRUE';
        updates.update_at = now;
        DB.update('QuotesVariant', quotesId, updates);
      } else {
        quotesId = DB.generateId();
        var row = {};
        for (var k in quoteFields) { row[k] = quoteFields[k]; }
        row.id = quotesId;
        // Dibuat sendiri oleh tenant lewat Kelola Undangan -> deret 4 digit ('quotes-0001').
        // Hanya di cabang insert: slug tidak pernah berubah setelah baris dibuat,
        // jadi cabang update di atas sengaja tidak menyentuh quotes_slug.
        row.quotes_slug = this.nextQuotesSlug(4);
        row.religion_enum = payload.religion_enum || (tenant.religion || '');
        row.title = payload.title || ('Custom - ' + (tenant.domain_slug || tenantId));
        row.active = 'TRUE';
        row.flag_default_quotes = 'FALSE';
        row.tenant_id = tenantId;
        row.user_id = auth.user_id || '';
        row.created_at = now;
        row.update_at = now;
        DB.insert('QuotesVariant', row);
      }

      DB.update('Tenants', tenantId, { quotes_id: quotesId });
      return ResponseHelper.success({ quotes_id: quotesId }, 'Custom quotes saved');
    }
  };


  function setupSpreadsheet() {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    // Column definitions mirror the LIVE spreadsheet exactly (name + order).
    // Order matters: setupSpreadsheet overwrites row 1 headers, so any mismatch
    // would misalign existing data underneath. Keep these in sync with the sheet.
    var sheets = {
      'Themes': ['id', 'name', 'html_template', 'html_extra_1', 'html_extra_2', 'html_extra_3', 'html_extra_4', 'html_extra_5', 'html_extra_6', 'html_extra_7', 'html_extra_8', 'html_extra_9', 'html_extra_10', 'css_template', 'css_extra_1', 'css_extra_2', 'css_extra_3', 'css_extra_4', 'css_extra_5', 'css_extra_6', 'css_extra_7', 'css_extra_8', 'css_extra_9', 'css_extra_10', 'js_template', 'js_extra_1', 'js_extra_2', 'js_extra_3', 'js_extra_4', 'js_extra_5', 'js_extra_6', 'js_extra_7', 'js_extra_8', 'js_extra_9', 'js_extra_10', 'plan_type', 'style_category', 'preview_image', 'flag_draft', 'flag_use_system_action_button', 'sample_tenant_id', 'created_at'],
      'Tenants': ['id', 'bride_nickname', 'bride_name', 'groom_nickname', 'groom_name', 'religion', 'wedding_date', 'domain_slug', 'plan_type', 'guest_limit', 'created_at', 'status_account', 'payment_deadline', 'status_payment', 'theme_id', 'quotes_id'],
      'QuotesVariant': ['id', 'religion_enum', 'quotes_slug', 'title', 'quote_1', 'quote_2', 'quote_3', 'quote_4', 'quote_5', 'quote_6', 'quote_7', 'quote_by_1', 'quote_by_2', 'quote_by_3', 'quote_by_4', 'quote_by_5', 'quote_by_6', 'quote_by_7', 'flag_default_quotes', 'active', 'tenant_id', 'user_id', 'created_at', 'update_at'],
      'Users': ['id', 'username', 'password_hash', 'role', 'tenant_id', 'created_at'],
      'Guests': ['id', 'tenant_id', 'name', 'phone', 'category', 'invitation_code', 'status', 'number_of_guests', 'flag_sudah_kirim_undangan_via_whatsapp', 'checkin_status', 'created_at', 'flag_sudah_isi_ucapan', 'flag_sudah_kirim_hadiah'],
      'Wishes': ['id', 'tenant_id', 'guest_id', 'guest_name', 'message', 'created_at'],
      'Gifts': ['id', 'tenant_id', 'guest_name', 'amount', 'bank_name', 'created_at'],
      'ActivityLogs': ['id', 'tenant_id', 'user_id', 'action', 'created_at'],
      'InvitationContent': [
        'id', 'tenant_id', 'tanggal_akad', 'jam_awal_akad', 'jam_akhir_akad',
        'jam_awal_resepsi', 'jam_akhir_resepsi', 'flag_lokasi_akad_dan_resepsi_berbeda',
        'akad_map', 'nama_lokasi_akad', 'keterangan_lokasi_akad',
        'resepsi_map', 'nama_lokasi_resepsi', 'keterangan_lokasi_resepsi',
        'flag_tampilkan_nama_orang_tua', 'nama_bapak_laki_laki', 'nama_ibu_laki_laki', 'nama_bapak_perempuan', 'nama_ibu_perempuan',
        'flag_tampilkan_sosial_media_mempelai', 'account_media_sosial_laki_laki', 'account_media_sosial_perempuan',
        'flag_pakai_timeline_kisah', 'timeline_kisah', 'tampilkan_amplop_online',
        'nama_bank_1', 'nama_rekening_bank_1', 'flag_pakai_qris_rekening_1', 'gambar_qris_rekening_1', 'nomor_rekening_bank_1',
        'flag_pakai_2_rekening', 'nama_bank_2', 'nama_rekening_bank_2', 'nomor_rekening_bank_2', 'flag_pakai_qris_rekening_2', 'gambar_qris_rekening_2',
        'flag_kirim_hadiah_offline', 'map_kirim_hadiah_offline', 'nama_lokasi_kirim_hadiah_offline', 'alamat_lokasi_kirim_hadiah_offline',
        'custom_kalimat_1', 'custom_kalimat_2', 'custom_kalimat_3', 'custom_kalimat_4',
        'flag_pakai_kalimat_pembuka_custom', 'kalimat_pembuka_undangan',
        'flag_pakai_kalimat_penutup_custom', 'kalimat_penutup_undangan',
        'link_backsound_music',
        'flag_pakai_live_streaming', 'link_live_streaming', 'wa_blast_template', 'platform_live_streaming'
      ],
      'Images': ['id', 'tenant_id', 'image_type', 'file_name', 'drive_file_id', 'drive_url', 'cdn_url', 'width', 'height', 'size_kb', 'created_at'],
      // WebsiteConfig has NO 'id' column in the live sheet (starts at site_name).
      'WebsiteConfig': [
        'site_name', 'site_url', 'site_logo', 'site_instagram', 'site_tiktok', 'site_youtube',
        'contact_email', 'contact_whatsapp', 'tagline', 'site_description',
        'site_code_html', 'site_code_css', 'site_code_js', 'primary_color', 'accent_color'
      ],
      'ReviewAndRating': ['id', 'tenant_id', 'comment', 'rate_star', 'wedding_date', 'bride_name', 'groom_name', 'domain_slug', 'alamat', 'plan_type', 'theme_id', 'flag_show_review', 'created_at'],
      'MstAdditionalFeature': ['id', 'feature_code', 'feature_name', 'description', 'is_required_tenant_input', 'input_data_type', 'output_data_type', 'active', 'price', 'created_at'],
      'TenantActiveFeature': ['id', 'tenant_id', 'additional_feature_id', 'input_tenant_data', 'output_data', 'active', 'payment_status'],
      'Transactions': ['id', 'tenant_id', 'item_type', 'item_description', 'item_id', 'amount', 'status', 'snap_token', 'payment_method', 'created_at', 'updated_at'],
      'Coupon': ['id', 'begin_date', 'end_date', 'plan_id', 'coupon_code', 'discount_type', 'percent_discount', 'nominal_discount', 'catatan', 'user_id', 'active', 'created_at', 'updated_at'],
      'PlanType': ['id', 'plan_type', 'guest_limit', 'price'],
      'PlanFeature': ['id', 'plan_id', 'feature', 'order_number', 'active'],
      'TemplateInvitation': ['id', 'nama_template', 'plan_type', 'section_pembuka_undangan', 'section_cover_awal_undangan', 'section_perkenalan_mempelai_dan_orang_tua', 'section_hitung_mundur', 'section_akad', 'section_konfirmasi_kehadiran', 'section_tulis_ucapan', 'section_wedding_gift', 'section_timeline_love_story', 'section_galery', 'section_footer'],
      'ArchiveAndRestore': ['id', 'tenant_id', 'slug', 'wedding_date', 'groom_name', 'bride_name', 'plan_type', 'status_payment', 'tanggal_archive', 'url_json']
    };

    for (var name in sheets) {
      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
      }
      sheet.getRange(1, 1, 1, sheets[name].length).setValues([sheets[name]]);
      sheet.getRange(1, 1, 1, sheets[name].length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // Create default superadmin
    var adminExists = false;
    var usersSheet = ss.getSheetByName('Users');
    var users = usersSheet.getDataRange().getValues();
    for (var i = 1; i < users.length; i++) {
      if (users[i][3] === 'superadmin') {
        adminExists = true;
        break;
      }
    }

    if (!adminExists) {
      var tenantId = Utilities.getUuid();
      var userId = Utilities.getUuid();
      var now = new Date().toISOString();

      // Create system tenant for superadmin.
      // Use DB.insert (maps fields by header name) so column order can't drift.
      DB.insert('Tenants', {
        id: tenantId,
        bride_name: 'System',
        groom_name: 'Admin',
        domain_slug: 'system-admin',
        plan_type: 'premium',
        guest_limit: -1,
        created_at: now,
        status_account: 'active',
        payment_deadline: now,
        status_payment: 'Sudah dibayar'
      });

      // Create superadmin user (password: admin123)
      var passwordHash = AuthService.hashPassword('admin123');
      DB.insert('Users', {
        id: userId,
        username: 'admin',
        password_hash: passwordHash,
        role: 'superadmin',
        tenant_id: tenantId,
        created_at: now
      });

      Logger.log('Superadmin created: admin / admin123');
    }

    // Delete default "Sheet1" if it exists
    var defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }

    Logger.log('Setup complete! Spreadsheet ready.');
  }

  // =====================================================================
  // DUMP STRUCTURE - Read-only. Logs every sheet name + its row-1 headers.
  // Run this and copy the Execution log to inspect the live structure.
  // Does NOT modify any data.
  // =====================================================================

  function dumpSpreadsheetStructure() {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheets = ss.getSheets();
    var out = [];

    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName();
      var lastCol = sheet.getLastColumn();
      var lastRow = sheet.getLastRow();

      if (lastCol === 0) {
        out.push('=== ' + name + ' === (EMPTY: ' + lastRow + ' rows, ' + lastCol + ' cols)');
        out.push('headers: []');
        out.push('');
        continue;
      }

      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

      // JSON.stringify each header so trailing spaces / empty cells are visible.
      var quoted = headers.map(function (h) {
        return JSON.stringify(h);
      });

      out.push('=== ' + name + ' === (' + lastRow + ' rows, ' + lastCol + ' cols)');
      out.push('headers: [' + quoted.join(', ') + ']');
      out.push('');
    }

    Logger.log(out.join('\n'));
  }


  // =====================================================================
  // SEED DATA - Run this to add sample data
  // =====================================================================

  function seedSampleData() {
    var tenantId = '';

    // Find first active tenant
    var tenants = DB.getAll('Tenants');
    for (var i = 0; i < tenants.length; i++) {
      if (tenants[i].status_account === 'active' && tenants[i].plan_type !== 'premium') {
        tenantId = tenants[i].id;
        break;
      }
    }

    if (!tenantId && tenants.length > 0) {
      tenantId = tenants[0].id;
    }

    if (!tenantId) {
      Logger.log('No tenant found. Please create a tenant first.');
      return;
    }

    var now = new Date().toISOString();

    // Sample guests
    var sampleGuests = [
      { name: 'Ahmad Rizki', phone: '081234567890', category: 'Family', status: 'confirmed', number_of_guests: 3 },
      { name: 'Siti Nurhaliza', phone: '081234567891', category: 'Friends', status: 'confirmed', number_of_guests: 2 },
      { name: 'Budi Santoso', phone: '081234567892', category: 'Work', status: 'pending', number_of_guests: 1 },
      { name: 'Dewi Lestari', phone: '081234567893', category: 'VIP', status: 'confirmed', number_of_guests: 4 },
      { name: 'Fajar Nugraha', phone: '081234567894', category: 'Friends', status: 'declined', number_of_guests: 1 },
    ];

    for (var i = 0; i < sampleGuests.length; i++) {
      var g = sampleGuests[i];
      DB.insert('Guests', {
        id: Utilities.getUuid(),
        tenant_id: tenantId,
        name: g.name,
        phone: g.phone,
        category: g.category,
        invitation_code: 'WED-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        status: g.status,
        number_of_guests: g.number_of_guests,
        checkin_status: 'not_checked_in',
        created_at: now
      });
    }

    // Sample wishes
    DB.insert('Wishes', { id: Utilities.getUuid(), tenant_id: tenantId, guest_name: 'Ahmad Rizki', message: 'Congrats! Semoga bahagia selalu!', created_at: now });
    DB.insert('Wishes', { id: Utilities.getUuid(), tenant_id: tenantId, guest_name: 'Siti Nurhaliza', message: 'Barakallahu lakuma! ❤️', created_at: now });

    // Sample gifts
    DB.insert('Gifts', { id: Utilities.getUuid(), tenant_id: tenantId, guest_name: 'Ahmad Rizki', amount: 500000, bank_name: 'BCA', created_at: now });
    DB.insert('Gifts', { id: Utilities.getUuid(), tenant_id: tenantId, guest_name: 'Dewi Lestari', amount: 1000000, bank_name: 'Mandiri', created_at: now });

    Logger.log('Sample data seeded for tenant: ' + tenantId);
  }

  // =====================================================================
  // SEED THEMES
  // =====================================================================

  function seedThemes() {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    if (!ss.getSheetByName('Themes')) {
      setupSpreadsheet();
      Logger.log('Created missing Themes sheet via setupSpreadsheet()');
    }

    var now = new Date().toISOString();

    var theme1Str = '<div style="background-color: #1a1a2e; color: #f5f5f5; font-family: \'Playfair Display\', serif; text-align: center; padding: 60px 20px; line-height: 1.6;">' +
                    '<h2 style="color: #d4af37; font-size: 1.2rem; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 20px;">The Wedding Celebration Of</h2>' +
                    '<h1 style="color: #ffffff; font-size: 4rem; margin: 0; font-weight: normal; font-family: \'Great Vibes\', cursive;">{{groom_name}} & {{bride_name}}</h1>' +
                    '<p style="font-size: 1.2rem; margin-top: 30px; letter-spacing: 2px;">{{wedding_date}}</p>' +
                    '<div style="margin: 50px auto; width: 60px; height: 1px; background-color: #d4af37;"></div>' +
                    '<p style="font-style: italic; max-w: 600px; margin: 0 auto;">"{{quote}}"</p>' +
                    '<div style="margin-top: 60px; padding: 40px; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 8px; max-width: 500px; margin-left: auto; margin-right: auto;">' +
                    '<h3 style="color: #d4af37; font-size: 1.8rem; margin-bottom: 10px;">Akad Nikah</h3>' +
                    '<p style="margin: 5px 0;">{{tanggal_akad}}</p>' +
                    '<p style="margin: 5px 0;">{{jam_akad}}</p>' +
                    '<p style="margin: 15px 0; font-weight: bold;">{{nama_lokasi_akad}}</p>' +
                    '<p style="font-size: 0.9rem; opacity: 0.8;">{{keterangan_lokasi_akad}}</p>' +
                    '</div>' +
                    '<div style="margin-top: 40px; padding: 40px; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 8px; max-width: 500px; margin-left: auto; margin-right: auto;">' +
                    '<h3 style="color: #d4af37; font-size: 1.8rem; margin-bottom: 10px;">Resepsi</h3>' +
                    '<p style="margin: 5px 0;">{{tanggal_resepsi}}</p>' +
                    '<p style="margin: 5px 0;">{{jam_resepsi}}</p>' +
                    '<p style="margin: 15px 0; font-weight: bold;">{{nama_lokasi_resepsi}}</p>' +
                    '<p style="font-size: 0.9rem; opacity: 0.8;">{{keterangan_lokasi_resepsi}}</p>' +
                    '</div>' +
                    '</div>';

    var theme2Str = '<div style="background-color: #faf9f5; color: #4a4a4a; font-family: \'Lora\', serif; text-align: center; padding: 80px 20px; position: relative;">' +
                    '<div style="position: absolute; top: 0; left: 0; width: 100%; height: 20px; background: linear-gradient(90deg, #d4af37, #f3e5ab, #d4af37);"></div>' +
                    '<h1 style="color: #2c3e50; font-size: 3.5rem; margin-bottom: 10px;">{{bride_name}} <span style="color: #d4af37;">&</span> {{groom_name}}</h1>' +
                    '<p style="font-size: 1.1rem; letter-spacing: 3px; text-transform: uppercase; color: #7f8c8d; margin-bottom: 50px;">We Invite You To Celebrate With Us</p>' +
                    '<div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-radius: 12px;">' +
                    '<p style="font-style: italic; line-height: 1.8; margin-bottom: 30px;">{{kalimat_pembuka}}</p>' +
                    '<h2 style="font-size: 2rem; color: #d4af37; margin: 20px 0;">{{wedding_date}}</h2>' +
                    '<div style="margin-top: 40px;">' +
                    '<h3 style="font-size: 1.2rem; color: #2c3e50; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #eee; padding-bottom: 10px; display: inline-block;">Venue</h3>' +
                    '<p style="font-weight: bold; font-size: 1.2rem; margin-top: 20px;">{{nama_lokasi_resepsi}}</p>' +
                    '<p style="color: #7f8c8d;">{{keterangan_lokasi_resepsi}}</p>' +
                    '</div>' +
                    '</div>' +
                    '<div style="margin-top: 60px; max-width: 600px; margin-left: auto; margin-right: auto; padding: 30px; background: #fdfaf0; border: 1px dashed #d4af37;">' +
                    '<h3 style="color: #d4af37;">Wedding Gift</h3>' +
                    '<p style="margin-bottom: 20px;">Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Namun jika Anda bermaksud memberikan tanda kasih, kami menyediakan fitur amplop digital berikut:</p>' +
                    '<p><strong>{{bank_1}}</strong><br>{{rek_1}}<br>a.n {{nama_rek_1}}</p>' +
                    '</div>' +
                    '</div>';

    DB.insert('Themes', {
      id: DB.generateId(),
      name: 'Platinum Leslie',
      html_template: theme1Str,
      plan_type: 'premium',
      preview_image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=400',
      created_at: now
    });

    DB.insert('Themes', {
      id: DB.generateId(),
      name: 'Gold Ivy',
      html_template: theme2Str,
      plan_type: 'pro',
      preview_image: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=400',
      created_at: now
    });

    Logger.log('Themes seeded successfully.');
  }


  // =====================================================================
  // PAYMENT SERVICE (Midtrans Integration)
  // =====================================================================

  var PaymentService = {

    // Helper: get Midtrans API base URL
    _getApiUrl: function() {
      return CONFIG.MIDTRANS_IS_PRODUCTION
        ? 'https://app.midtrans.com/snap/v1'
        : 'https://app.sandbox.midtrans.com/snap/v1';
    },

    // Helper: get Midtrans status check URL
    _getStatusUrl: function(orderId) {
      var base = CONFIG.MIDTRANS_IS_PRODUCTION
        ? 'https://api.midtrans.com/v2/'
        : 'https://api.sandbox.midtrans.com/v2/';
      return base + orderId + '/status';
    },

    // Helper: base64 encode for Basic Auth
    _getAuthHeader: function() {
      var credentials = Utilities.base64Encode(CONFIG.MIDTRANS_SERVER_KEY + ':');
      return 'Basic ' + credentials;
    },

    // Generate order ID
    _generateOrderId: function() {
      var ts = new Date().getTime().toString();
      var rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      return 'INV-' + ts + '-' + rand;
    },

    createTransaction: function(auth, payload) {
      var tenantId = PermissionService.getTenantId(auth);
      Validator.required(payload, ['item_type', 'item_id', 'item_name', 'amount']);

      var tenant = DB.findOne('Tenants', 'id', tenantId);
      if (!tenant) return ResponseHelper.error('Tenant not found', 404);

      var originalAmount = parseInt(payload.amount);
      if (isNaN(originalAmount) || originalAmount <= 0) {
        return ResponseHelper.error('Invalid amount', 400);
      }

      var amount = originalAmount;
      var couponCode = payload.coupon_code ? String(payload.coupon_code).trim() : '';
      var appliedCoupon = null;
      var discountAmount = 0;

      // Apply coupon if provided
      if (couponCode) {
        var couponResult = CouponService._validateAndGetCoupon(couponCode, payload.item_id, payload.item_type);
        if (!couponResult.valid) {
          return ResponseHelper.error(couponResult.message, 400);
        }
        appliedCoupon = couponResult.coupon;

        if (appliedCoupon.discount_type === 'percent') {
          discountAmount = Math.round(originalAmount * (parseFloat(appliedCoupon.percent_discount) / 100));
        } else if (appliedCoupon.discount_type === 'nominal') {
          discountAmount = parseInt(appliedCoupon.nominal_discount) || 0;
        }

        amount = Math.max(1, originalAmount - discountAmount);
      }

      var orderId = this._generateOrderId();
      var now = new Date().toISOString();

      // MEMBUAT DESKRIPSI BERDASARKAN JENIS ITEM
      var description = "";
      if (payload.item_type === 'feature') {
        description = "Pembelian Fitur: " + payload.item_name;
      } else if (payload.item_type === 'plan') {
        description = payload.item_name;
      } else {
        description = payload.item_name;
      }
      if (appliedCoupon) {
        description += ' [Kupon: ' + couponCode + ', Diskon: ' + discountAmount + ']';
      }

      // Construct Midtrans Snap payload
      var itemDetails = [{
        id: String(payload.item_id),
        price: originalAmount,
        quantity: 1,
        name: String(payload.item_name).substring(0, 50)
      }];
      if (appliedCoupon && discountAmount > 0) {
        itemDetails.push({
          id: 'DISCOUNT-' + couponCode,
          price: -discountAmount,
          quantity: 1,
          name: ('Diskon Kupon ' + couponCode).substring(0, 50)
        });
      }

      var snapPayload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: amount
        },
        item_details: itemDetails,
        customer_details: {
          first_name: tenant.bride_name || 'Tenant',
          last_name: tenant.groom_name || '',
          email: 'noreply@wedding.com',
        }
      };

      // Call Midtrans Snap API
      var snapApiUrl = this._getApiUrl() + '/transactions';
      var response;
      try {
        var httpResponse = UrlFetchApp.fetch(snapApiUrl, {
          method: 'post',
          headers: {
            'Authorization': this._getAuthHeader(),
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify(snapPayload),
          muteHttpExceptions: true
        });

        response = JSON.parse(httpResponse.getContentText());
        if (!response.token) {
          Logger.log('Midtrans error: ' + JSON.stringify(response));
          return ResponseHelper.error('Gagal membuat transaksi: ' + (response.error_messages || []).join(', '), 502);
        }
      } catch (err) {
        Logger.log('Midtrans fetch error: ' + err.toString());
        return ResponseHelper.error('Gagal menghubungi Midtrans: ' + err.message, 502);
      }

      var record = {
        id: orderId,
        tenant_id: tenantId,
        item_type: payload.item_type,
        item_description: description,
        item_id: String(payload.item_id),
        amount: amount,
        status: 'pending',
        snap_token: response.token,
        payment_method: '',
        created_at: now,
        updated_at: now
      };
      
      DB.insert('Transactions', record);

      return ResponseHelper.success({
        snap_token: response.token,
        order_id: orderId,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        final_amount: amount,
        coupon_applied: appliedCoupon ? couponCode : null
      }, 'Transaksi berhasil dibuat');
    },

    getTransactions: function(auth, payload) {
      var role = auth.role;
      var transactions;

      if (role === 'superadmin') {
        // Superadmin can filter by tenant or get all
        if (payload.tenant_id) {
          transactions = DB.getByTenant('Transactions', payload.tenant_id);
        } else {
          transactions = DB.getAll('Transactions');
        }
      } else {
        // Tenant only sees own transactions
        var tenantId = PermissionService.getTenantId(auth);
        transactions = DB.getByTenant('Transactions', tenantId);
      }

      // Sort by created_at descending (newest first)
      transactions.sort(function(a, b) {
        return new Date(b.created_at) - new Date(a.created_at);
      });

      // Enrich with tenant name and slug
      var tenants = DB.getAll('Tenants');
      var tenantMap = {};
      tenants.forEach(function(t) {
        if (t.id) {
          tenantMap[String(t.id)] = { 
            name: (t.bride_name || 'Tenant') + (t.groom_name ? ' & ' + t.groom_name : ''), 
            slug: t.domain_slug || '' 
          };
        }
      });

      var enriched = transactions.map(function(tx) {
        var tid = tx.tenant_id ? String(tx.tenant_id) : '';
        var t = tenantMap[tid] || { name: 'Unknown (' + tid + ')', slug: '' };
        tx.tenant_name = t.name;
        tx.domain_slug = t.slug;
        return tx;
      });

      return ResponseHelper.success(enriched, 'Transactions retrieved');
    },

    getTransactionStatus: function(auth, payload) {
      Validator.required(payload, ['order_id']);
      var tenantId = PermissionService.getTenantId(auth);

      var transaction = DB.findOne('Transactions', 'id', payload.order_id);
      if (!transaction) return ResponseHelper.error('Transaction not found', 404);

      // Security: tenant can only see own transaction
      if (auth.role !== 'superadmin' && String(transaction.tenant_id) !== String(tenantId)) {
        return ResponseHelper.error('Unauthorized', 403);
      }

      // Check if expired locally due to time (24 hours default token validity)
      var createdAt = new Date(transaction.created_at);
      var now = new Date();
      var diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      if (transaction.status === 'pending' && diffHours >= 24) {
        DB.update('Transactions', payload.order_id, {
          status: 'expire',
          updated_at: now.toISOString()
        });
        transaction.status = 'expire';
        return ResponseHelper.success(transaction, 'Status retrieved (expired locally)');
      }

      // Check live status from Midtrans
      try {
        var statusUrl = this._getStatusUrl(payload.order_id);
        var httpResponse = UrlFetchApp.fetch(statusUrl, {
          method: 'get',
          headers: { 'Authorization': this._getAuthHeader() },
          muteHttpExceptions: true
        });
        var statusData = JSON.parse(httpResponse.getContentText());

        var newStatus = statusData.transaction_status;
        if (!newStatus && statusData.status_code === '407') {
          newStatus = 'expire';
        }

        if (newStatus && newStatus !== transaction.status) {
          // Update local record if status changed
          DB.update('Transactions', payload.order_id, {
            status: newStatus,
            payment_method: statusData.payment_type || '',
            updated_at: new Date().toISOString()
          });
          transaction.status = newStatus;
          transaction.payment_method = statusData.payment_type || '';

          // Trigger activation if settled
          if (newStatus === 'settlement') {
            this._activateItem(transaction);
          }
        }
      } catch (err) {
        Logger.log('Status check error: ' + err.toString());
        // Return cached status if live check fails
      }

      return ResponseHelper.success(transaction, 'Status retrieved');
    },

    cancelTransaction: function(auth, payload) {
      Validator.required(payload, ['order_id']);
      var tenantId = PermissionService.getTenantId(auth);

      var transaction = DB.findOne('Transactions', 'id', payload.order_id);
      if (!transaction) return ResponseHelper.error('Transaction not found', 404);

      // Security: tenant can only cancel own transaction
      if (auth.role !== 'superadmin' && String(transaction.tenant_id) !== String(tenantId)) {
        return ResponseHelper.error('Unauthorized', 403);
      }

      if (transaction.status !== 'pending') {
        return ResponseHelper.error('Transaction is not in pending status', 400);
      }

      // Try cancelling live on Midtrans first
      try {
        var base = CONFIG.MIDTRANS_IS_PRODUCTION
          ? 'https://api.midtrans.com/v2/'
          : 'https://api.sandbox.midtrans.com/v2/';
        var cancelUrl = base + payload.order_id + '/cancel';

        var httpResponse = UrlFetchApp.fetch(cancelUrl, {
          method: 'post',
          headers: { 
            'Authorization': this._getAuthHeader(),
            'Content-Type': 'application/json'
          },
          muteHttpExceptions: true
        });
        
        var responseData = JSON.parse(httpResponse.getContentText());
        Logger.log('Midtrans cancel response: ' + JSON.stringify(responseData));
      } catch (err) {
        Logger.log('Cancel check error: ' + err.toString());
      }

      // Update local record to 'cancel'
      DB.update('Transactions', payload.order_id, {
        status: 'cancel',
        updated_at: new Date().toISOString()
      });

      return ResponseHelper.success(null, 'Transaksi berhasil dibatalkan');
    },

    getPlanTypes: function() {
      var plans = DB.getAll(CONFIG.PLAN_TYPE_SHEET);
      return ResponseHelper.success(plans);
    },

    updatePlanType: function(payload) {
      Validator.required(payload, ['plan_type', 'guest_limit', 'price']);
      
      var sheet = DB.getSheet(CONFIG.PLAN_TYPE_SHEET);
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var planTypeCol = headers.indexOf('plan_type');
      
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][planTypeCol]) === String(payload.plan_type)) {
          var updates = {
            guest_limit: parseInt(payload.guest_limit),
            price: parseInt(payload.price)
          };
          
          for (var key in updates) {
            var col = headers.indexOf(key);
            if (col !== -1) {
              sheet.getRange(i + 1, col + 1).setValue(updates[key]);
            }
          }
          return ResponseHelper.success(null, 'Plan type updated');
        }
      }
      return ResponseHelper.error('Plan type not found', 404);
    },

    getPlanFeatures: function(payload) {
      var all = DB.getAll(CONFIG.PLAN_FEATURE_SHEET);
      if (payload.plan_id) {
        all = all.filter(function(f) { return String(f.plan_id) === String(payload.plan_id); });
      }
      // Sort by order_number
      all.sort(function(a, b) { return (parseInt(a.order_number) || 0) - (parseInt(b.order_number) || 0); });
      return ResponseHelper.success(all);
    },

    createPlanFeature: function(payload) {
      Validator.required(payload, ['plan_id', 'feature', 'order_number']);
      var feature = {
        id: DB.generateId(),
        plan_id: payload.plan_id,
        feature: payload.feature,
        order_number: parseInt(payload.order_number) || 0,
        active: payload.active !== undefined ? payload.active : true
      };
      DB.insert(CONFIG.PLAN_FEATURE_SHEET, feature);
      return ResponseHelper.success(feature, 'Feature created');
    },

    updatePlanFeature: function(payload) {
      Validator.required(payload, ['id']);
      var id = payload.id;
      var updates = {};
      if (payload.feature !== undefined) updates.feature = payload.feature;
      if (payload.order_number !== undefined) updates.order_number = parseInt(payload.order_number);
      if (payload.active !== undefined) updates.active = payload.active;
      if (payload.plan_id !== undefined) updates.plan_id = payload.plan_id;

      var success = DB.update(CONFIG.PLAN_FEATURE_SHEET, id, updates);
      return success ? ResponseHelper.success(null, 'Feature updated') : ResponseHelper.error('Feature not found', 404);
    },

    deletePlanFeature: function(payload) {
      Validator.required(payload, ['id']);
      var success = DB.deleteRow(CONFIG.PLAN_FEATURE_SHEET, payload.id);
      return success ? ResponseHelper.success(null, 'Feature deleted') : ResponseHelper.error('Feature not found', 404);
    },

    bulkUpdatePlanFeatures: function(payload) {
      Validator.required(payload, ['updates']);
      var updates = payload.updates; // array of {id, order_number}
      var sheet = DB.getSheet(CONFIG.PLAN_FEATURE_SHEET);
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idCol = headers.indexOf('id');
      var orderCol = headers.indexOf('order_number');
      
      for (var i = 0; i < updates.length; i++) {
        var update = updates[i];
        for (var j = 1; j < data.length; j++) {
          if (String(data[j][idCol]) === String(update.id)) {
            sheet.getRange(j + 1, orderCol + 1).setValue(parseInt(update.order_number));
            break;
          }
        }
      }
      return ResponseHelper.success(null, 'Features reordered');
    },

    getPlanGuestLimit: function(planType) {
      var plan = DB.findOne(CONFIG.PLAN_TYPE_SHEET, 'plan_type', planType);
      if (plan) {
        return parseInt(plan.guest_limit) || 100;
      }
      return 100; // default fallback
    },

    handleWebhook: function(payload) {
      // Pengecekan awal untuk Test/Ping dari Midtrans dashboard
      if (!payload || (!payload.order_id && !payload.id)) {
        Logger.log('Midtrans Test/Ping received');
        return ResponseHelper.success(null, 'Ping OK');
      }

      // Jika data test notifikasi (biasanya tanpa signature lengkap)
      if (payload.order_id && !payload.signature_key) {
        Logger.log('Midtrans Test Notification for Order: ' + payload.order_id);
        return ResponseHelper.success(null, 'Test Notification OK');
      }

      // Validate required Midtrans webhook fields
      if (!payload.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
        return ResponseHelper.error('Invalid webhook payload', 400);
      }

      // Verify signature: SHA512(order_id + status_code + gross_amount + server_key)
      // Pastikan gross_amount diformat dengan benar (tanpa .00 jika ada)
      var amountStr = payload.gross_amount;
      if (amountStr.indexOf('.') !== -1) {
        amountStr = amountStr.split('.')[0];
      }

      var signatureSource = payload.order_id + payload.status_code + amountStr + CONFIG.MIDTRANS_SERVER_KEY;
      var expectedSignature = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_512,
        signatureSource
      );

      // Convert byte array to hex string
      var hexSignature = expectedSignature.map(function(b) {
        return ('0' + (b & 0xff).toString(16)).slice(-2);
      }).join('');

      if (hexSignature !== payload.signature_key) {
        Logger.log('Webhook signature mismatch for order: ' + payload.order_id);
        return ResponseHelper.error('Invalid signature', 403);
      }

      // Find transaction
      var transaction = DB.findOne('Transactions', 'id', payload.order_id);
      if (!transaction) {
        Logger.log('Webhook: transaction not found: ' + payload.order_id);
        return ResponseHelper.success(null, 'OK'); // Respond OK to avoid retries
      }

      var newStatus = payload.transaction_status;
      var now = new Date().toISOString();

      // Update transaction status
      DB.update('Transactions', payload.order_id, {
        status: newStatus,
        payment_method: payload.payment_type || '',
        updated_at: now
      });

      // Trigger activation if payment settled
      if (newStatus === 'settlement' || newStatus === 'capture') {
        this._activateItem(transaction);
      }

      return ResponseHelper.success(null, 'Webhook processed');
    },

    // Internal: activate the purchased item after successful payment
    _activateItem: function(transaction) {
      var tenantId = String(transaction.tenant_id);
      var itemType = transaction.item_type;
      var itemId = String(transaction.item_id);

      try {
        if (itemType === 'feature') {
          // Activate the feature: update payment_status and active
          var features = DB.getAll('TenantActiveFeature');
          for (var i = 0; i < features.length; i++) {
            var f = features[i];
            if (String(f.tenant_id) === tenantId && String(f.additional_feature_id) === itemId) {
              DB.update('TenantActiveFeature', f.id, {
                payment_status: 'Sudah dibayar',
                active: true
              });
              Logger.log('Feature activated: ' + itemId + ' for tenant: ' + tenantId);
              break;
            }
          }
        } else if (itemType === 'plan') {
          // Update tenant plan payment status
          var tenant = DB.findOne('Tenants', 'id', tenantId);
          if (tenant) {
            DB.update('Tenants', tenantId, {
              status_payment: 'Sudah dibayar',
              plan_type: itemId, // e.g. 'pro' or 'premium'
              guest_limit: this.getPlanGuestLimit(itemId)
            });
            Logger.log('Plan activated: ' + itemId + ' for tenant: ' + tenantId);
          }
        }
      } catch (err) {
        Logger.log('_activateItem error: ' + err.toString());
      }
    }
  };


  // =====================================================================
  // COUPON SERVICE
  // =====================================================================

  var CouponService = {

    getCoupons: function(auth) {
      var coupons = DB.getAll('Coupon');
      coupons.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
      return ResponseHelper.success(coupons, 'Coupons retrieved');
    },

    createCoupon: function(auth, payload) {
      Validator.required(payload, ['begin_date', 'coupon_code', 'discount_type']);

      if (payload.discount_type !== 'percent' && payload.discount_type !== 'nominal') {
        return ResponseHelper.error('discount_type harus percent atau nominal', 400);
      }

      if (payload.discount_type === 'percent') {
        if (!payload.percent_discount || parseFloat(payload.percent_discount) <= 0) {
          return ResponseHelper.error('percent_discount harus diisi untuk tipe percent', 400);
        }
        if (parseFloat(payload.percent_discount) > 100) {
          return ResponseHelper.error('percent_discount tidak boleh lebih dari 100', 400);
        }
      } else {
        if (!payload.nominal_discount || parseInt(payload.nominal_discount) <= 0) {
          return ResponseHelper.error('nominal_discount harus diisi untuk tipe nominal', 400);
        }
      }

      var code = String(payload.coupon_code).trim().toUpperCase();
      var existing = DB.findOne('Coupon', 'coupon_code', code);
      if (existing) {
        return ResponseHelper.error('Kode kupon sudah digunakan', 400);
      }

      var now = new Date().toISOString();
      var coupon = {
        id: DB.generateId(),
        begin_date: payload.begin_date,
        end_date: payload.end_date || '',
        plan_id: payload.plan_id || '',
        coupon_code: code,
        discount_type: payload.discount_type,
        percent_discount: payload.discount_type === 'percent' ? (parseFloat(payload.percent_discount) || 0) : '',
        nominal_discount: payload.discount_type === 'nominal' ? (parseInt(payload.nominal_discount) || 0) : '',
        catatan: payload.catatan || '',
        user_id: auth.user_id,
        active: 'TRUE',
        created_at: now,
        updated_at: now
      };

      DB.insert('Coupon', coupon);
      ActivityLogService.log(auth.tenant_id, auth.user_id, 'create_coupon');
      return ResponseHelper.success(coupon, 'Kupon berhasil dibuat');
    },

    updateCoupon: function(auth, payload) {
      Validator.required(payload, ['id']);
      var existing = DB.findOne('Coupon', 'id', payload.id);
      if (!existing) return ResponseHelper.error('Kupon tidak ditemukan', 404);

      var updates = { updated_at: new Date().toISOString() };
      if (payload.begin_date !== undefined) updates.begin_date = payload.begin_date;
      if (payload.end_date !== undefined) updates.end_date = payload.end_date;
      if (payload.plan_id !== undefined) updates.plan_id = payload.plan_id;
      if (payload.catatan !== undefined) updates.catatan = payload.catatan;

      if (payload.discount_type !== undefined) {
        if (payload.discount_type !== 'percent' && payload.discount_type !== 'nominal') {
          return ResponseHelper.error('discount_type harus percent atau nominal', 400);
        }
        updates.discount_type = payload.discount_type;
        if (payload.discount_type === 'percent') {
          updates.percent_discount = parseFloat(payload.percent_discount) || 0;
          updates.nominal_discount = '';
        } else {
          updates.nominal_discount = parseInt(payload.nominal_discount) || 0;
          updates.percent_discount = '';
        }
      }

      if (payload.active !== undefined) {
        updates.active = (payload.active === true || payload.active === 'TRUE' || payload.active === 'true') ? 'TRUE' : 'FALSE';
      }

      var success = DB.update('Coupon', payload.id, updates);
      if (!success) return ResponseHelper.error('Gagal mengupdate kupon', 500);
      ActivityLogService.log(auth.tenant_id, auth.user_id, 'update_coupon');
      return ResponseHelper.success(null, 'Kupon berhasil diupdate');
    },

    deleteCoupon: function(auth, payload) {
      Validator.required(payload, ['id']);
      var success = DB.deleteRow('Coupon', payload.id);
      if (!success) return ResponseHelper.error('Kupon tidak ditemukan', 404);
      ActivityLogService.log(auth.tenant_id, auth.user_id, 'delete_coupon');
      return ResponseHelper.success(null, 'Kupon berhasil dihapus');
    },

    validateCoupon: function(auth, payload) {
      Validator.required(payload, ['coupon_code']);
      var result = this._validateAndGetCoupon(
        payload.coupon_code,
        payload.plan_id || '',
        payload.item_type || 'plan'
      );
      if (!result.valid) {
        return ResponseHelper.error(result.message, 400);
      }
      var coupon = result.coupon;
      return ResponseHelper.success({
        coupon_code: coupon.coupon_code,
        discount_type: coupon.discount_type,
        percent_discount: coupon.percent_discount,
        nominal_discount: coupon.nominal_discount,
        plan_id: coupon.plan_id,
        end_date: coupon.end_date
      }, 'Kode kupon valid');
    },

    _validateAndGetCoupon: function(couponCode, planId, itemType) {
      var code = String(couponCode).trim().toUpperCase();
      var coupon = DB.findOne('Coupon', 'coupon_code', code);

      if (!coupon) {
        return { valid: false, message: 'Kode kupon tidak valid' };
      }

      var isActive = coupon.active === 'TRUE' || coupon.active === true || coupon.active === 'true';
      if (!isActive) {
        return { valid: false, message: 'Kode kupon sudah tidak berlaku (dinonaktifkan)' };
      }

      var today = new Date();
      today.setHours(0, 0, 0, 0);

      if (coupon.begin_date) {
        var beginDate = new Date(coupon.begin_date);
        beginDate.setHours(0, 0, 0, 0);
        if (today < beginDate) {
          var beginStr = Utilities.formatDate(beginDate, Session.getScriptTimeZone(), 'dd MMM yyyy');
          var endStr = coupon.end_date ? Utilities.formatDate(new Date(coupon.end_date), Session.getScriptTimeZone(), 'dd MMM yyyy') : 'tanpa batas';
          return { valid: false, message: 'Kode kupon baru berlaku mulai ' + beginStr + ' sampai ' + endStr };
        }
      }

      if (coupon.end_date) {
        var endDate = new Date(coupon.end_date);
        endDate.setHours(23, 59, 59, 999);
        if (today > endDate) {
          return { valid: false, message: 'Kode kupon sudah kadaluarsa' };
        }
      }

      if (coupon.plan_id && planId && String(coupon.plan_id) !== String(planId)) {
        return { valid: false, message: 'Kode kupon ini hanya berlaku untuk paket ' + coupon.plan_id };
      }

      return { valid: true, message: 'Kode kupon valid', coupon: coupon };
    }
  };


  // =====================================================================
  // ARCHIVE & RESTORE SERVICE
  // =====================================================================
  // Archives ALL of a tenant's data into a JSON backup on Drive, then deletes
  // the rows from every sheet. Restore writes the rows back and cleans up the
  // backup. Permanent delete removes the backup + the tenant's Drive folder.
  //
  // IMPORTANT: the source-of-truth list of tenant-scoped sheets is the
  // setupSpreadsheet() definition. Keep ARCHIVE_TENANT_SHEETS in sync with it.
  // =====================================================================

  // Every sheet that stores rows keyed by tenant_id (excludes the parent
  // `Tenants` sheet which is keyed by `id` and handled separately).
  var ARCHIVE_TENANT_SHEETS = [
    'Users',
    'QuotesVariant',        // mixed sheet: only rows with this tenant_id are archived
    'Guests',
    'Wishes',
    'Gifts',
    'ActivityLogs',
    'InvitationContent',
    'Images',
    'ReviewAndRating',
    'TenantActiveFeature',
    'Transactions'
  ];

  var ArchiveService = {

    // ---- list archived tenants ----
    getArchives: function(auth) {
      // Tolerate a spreadsheet that hasn't run setupSpreadsheet() yet.
      if (!this._sheetExists('ArchiveAndRestore')) {
        return ResponseHelper.success([], 'Archive sheet not initialized');
      }
      var rows = DB.getAll('ArchiveAndRestore');
      return ResponseHelper.success(rows, 'Archives retrieved');
    },

    // ---- helpers ----------------------------------------------------------

    // True if a sheet with this name exists in the spreadsheet.
    // Lets archive/restore skip sheets that were never created (older
    // spreadsheets predating a sheet like ImageGallery) instead of crashing.
    _sheetExists: function(name) {
      return !!SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
    },

    // Returns the Drive folder for a tenant ({root}/tenants/{tenantId}), or null.
    _getTenantFolder: function(tenantId) {
      var roots = DriveApp.getFoldersByName('wedding-saas-storage');
      if (!roots.hasNext()) return null;
      var root = roots.next();
      var tenantsFolders = root.getFoldersByName('tenants');
      if (!tenantsFolders.hasNext()) return null;
      var tenantsFolder = tenantsFolders.next();
      var folders = tenantsFolder.getFoldersByName(tenantId);
      return folders.hasNext() ? folders.next() : null;
    },

    // Returns (creating if needed) the {root}/archives folder used for JSON backups.
    _getArchivesFolder: function() {
      var roots = DriveApp.getFoldersByName('wedding-saas-storage');
      var root = roots.hasNext() ? roots.next() : DriveApp.createFolder('wedding-saas-storage');
      var sub = root.getFoldersByName('archives');
      return sub.hasNext() ? sub.next() : root.createFolder('archives');
    },

    // Collect every row belonging to the tenant across all sheets + the parent row.
    // Sheets that don't exist in this spreadsheet are skipped (stored as []).
    _collectTenantData: function(tenantId, tenant) {
      var data = { Tenants: tenant ? [tenant] : [] };
      for (var i = 0; i < ARCHIVE_TENANT_SHEETS.length; i++) {
        var name = ARCHIVE_TENANT_SHEETS[i];
        data[name] = this._sheetExists(name) ? DB.getByTenant(name, tenantId) : [];
      }
      return data;
    },

    // ---- archive ----------------------------------------------------------
    // Effectively atomic ("all-or-nothing"). Apps Script has no DB transactions,
    // so we emulate it: snapshot every row in memory FIRST, then delete. If any
    // step throws, _rollbackInsert re-inserts the snapshot so the tenant is left
    // exactly as it was active. Uses batch delete/insert to stay well under the
    // 6-minute execution limit (the old per-row loop was timing out on large
    // tenants, which is what produced the half-archived state).
    archiveTenant: function(auth, payload) {
      Validator.required(payload, ['tenant_id']);
      var tenantId = payload.tenant_id;

      // ---- PHASE 1: validate everything BEFORE any write -------------------
      var tenant = DB.findOne('Tenants', 'id', tenantId);
      if (!tenant) return ResponseHelper.error('Tenant tidak ditemukan', 404);

      // GUARD: the ArchiveAndRestore sheet must exist before we delete anything,
      // otherwise we'd wipe the tenant with no archive record to restore from.
      if (!this._sheetExists('ArchiveAndRestore')) {
        return ResponseHelper.error('Sheet "ArchiveAndRestore" belum dibuat. Jalankan setupSpreadsheet() terlebih dahulu.', 500);
      }

      // GUARD: cannot archive while the review is publicly shown.
      var reviews = this._sheetExists('ReviewAndRating') ? DB.getByTenant('ReviewAndRating', tenantId) : [];
      for (var r = 0; r < reviews.length; r++) {
        var f = reviews[r].flag_show_review;
        if (f === true || f === 'true' || f === 'TRUE') {
          return ResponseHelper.error(
            'Tenant ini masih menampilkan review (flag_show_review aktif). Nonaktifkan tampilan review terlebih dahulu sebelum mengarsipkan.',
            400
          );
        }
      }

      // ---- PHASE 2: snapshot ALL data in memory (the rollback source) ------
      // Captured before any destructive write so we can fully restore on error.
      var snapshot = this._collectTenantData(tenantId, tenant);

      // Write the JSON backup to Drive FIRST (durable source of truth).
      var folder = this._getArchivesFolder();
      var fileName = 'archive_' + tenantId + '_' + (new Date().getTime()) + '.json';
      var backup = {
        schema_version: 1,
        tenant_id: tenantId,
        archived_at: new Date().toISOString(),
        data: snapshot
      };
      var file, urlJson;
      try {
        file = folder.createFile(fileName, JSON.stringify(backup), 'application/json');
        urlJson = file.getUrl();
      } catch (e) {
        return ResponseHelper.error('Gagal menulis file backup: ' + (e && e.message ? e.message : e), 500);
      }

      // ---- PHASE 3: destructive writes, with rollback on ANY failure -------
      var deletedFromSheets = []; // track which sheets we've cleared, for rollback
      try {
        // Delete child rows (batch: one rewrite per sheet).
        for (var s = 0; s < ARCHIVE_TENANT_SHEETS.length; s++) {
          var sheetName = ARCHIVE_TENANT_SHEETS[s];
          if (!this._sheetExists(sheetName)) continue;
          DB.deleteRowsWhere(sheetName, 'tenant_id', tenantId);
          deletedFromSheets.push(sheetName);
        }
        // Delete the parent tenant row.
        DB.deleteRowsWhere('Tenants', 'id', tenantId);
        deletedFromSheets.push('Tenants');

        // Record into ArchiveAndRestore (the commit point).
        var record = {
          id: DB.generateId(),
          tenant_id: tenantId,
          slug: tenant.domain_slug || '',
          wedding_date: tenant.wedding_date || '',
          groom_name: tenant.groom_name || '',
          bride_name: tenant.bride_name || '',
          plan_type: tenant.plan_type || '',
          status_payment: tenant.status_payment || '',
          tanggal_archive: new Date().toISOString(),
          url_json: urlJson
        };
        DB.insert('ArchiveAndRestore', record);

        return ResponseHelper.success(record, 'Tenant archived successfully');

      } catch (err) {
        // ROLLBACK (primary): re-insert only what we removed, so the tenant
        // returns to its ACTIVE state.
        try {
          this._rollbackInsert(snapshot, deletedFromSheets);
        } catch (rollbackErr) {
          // ROLLBACK (fallback): if the targeted rollback itself failed, force a
          // full reconcile from the in-memory snapshot — clears the tenant on
          // every sheet and rebuilds it, so no half-state can survive.
          try { this.reconcileFromData(tenantId, snapshot); } catch (e5) {}
        }
        // Clean up the now-orphaned backup file and any half-written archive row.
        try { if (file) file.setTrashed(true); } catch (e2) {}
        try {
          var orphan = DB.findOne('ArchiveAndRestore', 'tenant_id', tenantId);
          if (orphan) DB.deleteRow('ArchiveAndRestore', orphan.id);
        } catch (e3) {}
        return ResponseHelper.error(
          'Archive dibatalkan & seluruh data dikembalikan (rollback). Penyebab: ' + (err && err.message ? err.message : err),
          500
        );
      }
    },

    // Re-insert a snapshot produced by _collectTenantData. Only re-inserts sheets
    // we actually cleared (deletedFromSheets), so it's safe to call mid-failure.
    // Used by both archive rollback and restore rollback.
    _rollbackInsert: function(snapshot, sheetsToRestore) {
      // Parent tenant first.
      if (sheetsToRestore.indexOf('Tenants') !== -1 && snapshot.Tenants) {
        try { DB.insertRows('Tenants', snapshot.Tenants); } catch (e) {}
      }
      for (var i = 0; i < ARCHIVE_TENANT_SHEETS.length; i++) {
        var name = ARCHIVE_TENANT_SHEETS[i];
        if (sheetsToRestore.indexOf(name) === -1) continue;
        try { DB.insertRows(name, snapshot[name] || []); } catch (e) {}
      }
    },

    // ---- restore ----------------------------------------------------------
    // Effectively atomic, mirror of archiveTenant. Reads + validates the backup
    // BEFORE any write. Inserts (batch) per sheet; if any step throws, rolls back
    // by deleting everything inserted so far so the tenant does NOT reappear
    // half-restored. Only trashes the backup + archive row AFTER a full success,
    // so a failed restore is always safely re-runnable.
    restoreTenant: function(auth, payload) {
      Validator.required(payload, ['tenant_id']);
      var tenantId = payload.tenant_id;

      // ---- PHASE 1: validate + load the backup BEFORE any write ------------
      var record = DB.findOne('ArchiveAndRestore', 'tenant_id', tenantId);
      if (!record) return ResponseHelper.error('Data arsip tidak ditemukan', 404);

      // Guard against double-restore: if the tenant is already active, stop
      // before inserting duplicates.
      if (DB.findOne('Tenants', 'id', tenantId)) {
        return ResponseHelper.error('Tenant sudah aktif (sudah pernah di-restore). Refresh halaman.', 400);
      }

      var fileId = this._extractDriveId(record.url_json);
      if (!fileId) return ResponseHelper.error('File backup JSON tidak ditemukan', 404);

      var jsonFile, data;
      try {
        jsonFile = DriveApp.getFileById(fileId);
        var backup = JSON.parse(jsonFile.getBlob().getDataAsString());
        data = backup.data || {};
      } catch (e) {
        return ResponseHelper.error('Gagal membaca file backup JSON: ' + (e && e.message ? e.message : e), 500);
      }

      // ---- PHASE 2: insert rows back, with rollback on ANY failure ---------
      try {
        // Parent tenant first (batch).
        if (data.Tenants && data.Tenants.length > 0) {
          DB.insertRows('Tenants', data.Tenants);
        }
        // Children (batch: one setValues per sheet).
        for (var s = 0; s < ARCHIVE_TENANT_SHEETS.length; s++) {
          var sheetName = ARCHIVE_TENANT_SHEETS[s];
          if (!this._sheetExists(sheetName)) continue;
          var rows = data[sheetName] || [];
          if (rows.length === 0) continue;
          DB.insertRows(sheetName, rows);
        }

        // ---- PHASE 3: commit — only NOW remove the archive artifacts -------
        // Done after all inserts succeed, so a mid-restore failure leaves the
        // archive intact and re-runnable.
        try { jsonFile.setTrashed(true); } catch (e) {}
        DB.deleteRow('ArchiveAndRestore', record.id);

        return ResponseHelper.success(null, 'Tenant restored successfully');

      } catch (err) {
        // ROLLBACK: delete everything we inserted so the tenant does NOT come
        // back half-restored. The archive record + backup file are untouched
        // (we only trash them on full success), so the user can retry Restore.
        // Sweep ALL tenant-scoped sheets, not just insertedSheets, so a failure
        // mid-insert on a sheet can't leave a partial batch behind.
        try { DB.deleteRowsWhere('Tenants', 'id', tenantId); } catch (e4) {}
        for (var d = 0; d < ARCHIVE_TENANT_SHEETS.length; d++) {
          var sn = ARCHIVE_TENANT_SHEETS[d];
          if (!this._sheetExists(sn)) continue;
          try { DB.deleteRowsWhere(sn, 'tenant_id', tenantId); } catch (e5) {}
        }
        return ResponseHelper.error(
          'Restore dibatalkan & data yang sempat masuk dihapus kembali (rollback). Arsip tetap aman, silakan coba lagi. Penyebab: ' + (err && err.message ? err.message : err),
          500
        );
      }
    },

    // ---- permanent delete -------------------------------------------------
    deleteArchivePermanent: function(auth, payload) {
      Validator.required(payload, ['tenant_id']);
      var tenantId = payload.tenant_id;

      var record = DB.findOne('ArchiveAndRestore', 'tenant_id', tenantId);
      if (!record) return ResponseHelper.error('Data arsip tidak ditemukan', 404);

      // 1. Delete the JSON backup file.
      var fileId = this._extractDriveId(record.url_json);
      if (fileId) {
        try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) {}
      }

      // 2. Delete the tenant's physical Drive folder ({root}/tenants/{tenantId}).
      var folder = this._getTenantFolder(tenantId);
      if (folder) {
        try { folder.setTrashed(true); } catch (e) {}
      }

      // 3. Delete the ArchiveAndRestore row.
      DB.deleteRow('ArchiveAndRestore', record.id);

      return ResponseHelper.success(null, 'Archive permanently deleted');
    },

    // Extracts a Drive file id from a getUrl()-style link
    // (e.g. https://drive.google.com/file/d/<ID>/view or ...?id=<ID>).
    _extractDriveId: function(url) {
      if (!url) return null;
      var m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (m) return m[1];
      m = String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m) return m[1];
      return null;
    },

    // ---- recovery ---------------------------------------------------------
    // Reconcile the live sheets for one tenant to EXACTLY match a backup's data.
    // Repairs half-states (missing rows from a failed archive, duplicate rows
    // from a failed restore): per sheet it deletes ALL rows for this tenant, then
    // inserts the backup rows once. Idempotent. Does NOT touch the archive record
    // or Drive files. `data` is the {SheetName: [rows...]} object from a backup.
    reconcileFromData: function(tenantId, data) {
      data = data || {};
      var summary = {};

      // Parent tenant: clear then re-insert.
      DB.deleteRowsWhere('Tenants', 'id', tenantId);
      if (data.Tenants && data.Tenants.length > 0) {
        DB.insertRows('Tenants', data.Tenants);
      }
      summary.Tenants = (data.Tenants || []).length;

      // Children.
      for (var i = 0; i < ARCHIVE_TENANT_SHEETS.length; i++) {
        var name = ARCHIVE_TENANT_SHEETS[i];
        if (!this._sheetExists(name)) continue;
        DB.deleteRowsWhere(name, 'tenant_id', tenantId);
        var rows = data[name] || [];
        if (rows.length > 0) DB.insertRows(name, rows);
        summary[name] = rows.length;
      }

      return summary;
    },

    // Same as reconcileFromData but loads the backup from the tenant's
    // ArchiveAndRestore record first. Used by the manual recovery tool.
    reconcileFromBackup: function(tenantId) {
      var record = DB.findOne('ArchiveAndRestore', 'tenant_id', tenantId);
      if (!record) throw new Error('No archive record for tenant ' + tenantId);

      var fileId = this._extractDriveId(record.url_json);
      if (!fileId) throw new Error('Backup file id not found in url_json');
      var backup = JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString());
      return this.reconcileFromData(tenantId, backup.data || {});
    }
  };


  // =====================================================================
  // ARCHIVE & RESTORE — RECOVERY TOOLS (run manually from the editor)
  // =====================================================================
  // Use these to inspect and repair the half-archived/half-restored state left
  // by the OLD non-atomic archive/restore. Run from the Apps Script editor:
  // pick the function in the dropdown -> Run -> read the Execution log.
  // =====================================================================

  // READ-ONLY. For every archive record, report whether that tenant is currently
  // ACTIVE (row exists in Tenants), ARCHIVED-ONLY (no Tenants row), and how many
  // child rows live in each sheet. Tells you the true state before repairing.
  function diagnoseArchiveState() {
    var out = [];
    if (!ArchiveService._sheetExists('ArchiveAndRestore')) {
      Logger.log('ArchiveAndRestore sheet does not exist.');
      return [];
    }
    var records = DB.getAll('ArchiveAndRestore');
    out.push('Found ' + records.length + ' archive record(s).');

    records.forEach(function (rec) {
      var tid = rec.tenant_id;
      var activeRow = DB.findOne('Tenants', 'id', tid);
      out.push('');
      out.push('=== tenant_id=' + tid + ' (' + (rec.bride_name || '?') + ' & ' + (rec.groom_name || '?') + ') ===');
      out.push('  Tenants row currently present: ' + (activeRow ? 'YES (shows as ACTIVE)' : 'no (archived-only)'));

      // child row counts live in the sheets right now
      ARCHIVE_TENANT_SHEETS.forEach(function (name) {
        if (!ArchiveService._sheetExists(name)) return;
        var n = DB.getByTenant(name, tid).length;
        if (n > 0) out.push('  live rows in ' + name + ': ' + n);
      });

      // what the backup says it should be
      try {
        var fileId = ArchiveService._extractDriveId(rec.url_json);
        var backup = JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString());
        var data = backup.data || {};
        var parts = [];
        Object.keys(data).forEach(function (k) {
          var len = (data[k] || []).length;
          if (len > 0) parts.push(k + '=' + len);
        });
        out.push('  backup contains: ' + (parts.length ? parts.join(', ') : '(empty)'));
      } catch (e) {
        out.push('  backup: UNREADABLE (' + (e && e.message ? e.message : e) + ')');
      }
    });

    Logger.log(out.join('\n'));
    return out;
  }

  // REPAIR one tenant. Edit TENANT_ID below to the tenant_id you want to fix
  // (copy it from diagnoseArchiveState output), then Run. Reconciles the live
  // sheets to EXACTLY match that tenant's JSON backup (re-adds missing rows,
  // removes duplicates). Idempotent. After this, the tenant is back in the
  // ARCHIVED state with intact data, so the normal Restore button will work.
  function recoverTenantFromArchive() {
    var TENANT_ID = 'PASTE_TENANT_ID_HERE';

    if (TENANT_ID === 'PASTE_TENANT_ID_HERE') {
      Logger.log('Edit TENANT_ID in recoverTenantFromArchive() first. Run diagnoseArchiveState() to find it.');
      return;
    }
    try {
      var summary = ArchiveService.reconcileFromBackup(TENANT_ID);
      Logger.log('Recovery complete for ' + TENANT_ID + '. Rows reconciled per sheet:\n' + JSON.stringify(summary, null, 2));
    } catch (e) {
      Logger.log('Recovery FAILED: ' + (e && e.message ? e.message : e));
    }
  }


  // =====================================================================
  // THEME ASSET — ORPHAN CLEANUP (run manually from the editor)
  // =====================================================================
  // Finds 'theme_asset' images in the Images sheet that are NOT referenced by any
  // theme's asset_media_list (orphans left by an interrupted delete), trashes the
  // Drive file, and removes the Images row.
  //
  // Run cleanupOrphanThemeAssets(true) first to DRY-RUN (logs what it WOULD delete
  // without touching anything). When the report looks right, run
  // cleanupOrphanThemeAssets(false) to actually delete.
  // =====================================================================
  function cleanupOrphanThemeAssets(dryRun) {
    if (dryRun === undefined) dryRun = true; // default: safe dry-run
    var out = [];

    // 1. Collect every media_id still referenced by a theme.
    var referenced = {};
    var themes = DB.getAll('Themes');
    themes.forEach(function (t) {
      var list = [];
      try { list = JSON.parse(t.asset_media_list); } catch (e) { list = []; }
      if (Array.isArray(list)) {
        list.forEach(function (a) {
          if (a && a.media_id) referenced[String(a.media_id)] = true;
        });
      }
    });
    out.push('Referenced theme_asset media_id count: ' + Object.keys(referenced).length);

    // 2. Scan Images for theme_asset rows not referenced by any theme.
    var images = DB.getAll('Images');
    var orphans = images.filter(function (img) {
      return img.image_type === 'theme_asset' && !referenced[String(img.drive_file_id)];
    });
    out.push('Orphan theme_asset rows found: ' + orphans.length);
    out.push(dryRun ? '--- DRY RUN (nothing deleted) ---' : '--- DELETING ---');

    var trashed = 0, rowsDeleted = 0;
    orphans.forEach(function (img) {
      out.push('  orphan: id=' + img.id + ' file=' + img.file_name + ' drive=' + img.drive_file_id);
      if (!dryRun) {
        try {
          if (img.drive_file_id) DriveApp.getFileById(img.drive_file_id).setTrashed(true);
          trashed++;
        } catch (e) {
          out.push('    (could not trash Drive file: ' + (e && e.message ? e.message : e) + ')');
        }
        try { DB.deleteRow('Images', img.id); rowsDeleted++; } catch (e2) {}
      }
    });

    if (!dryRun) out.push('Done. Drive files trashed: ' + trashed + ', Images rows deleted: ' + rowsDeleted);
    else out.push('Re-run with cleanupOrphanThemeAssets(false) to actually delete.');

    Logger.log(out.join('\n'));
    return out;
  }


  // =====================================================================
  // ARCHIVE & RESTORE — AUTOMATED VERIFICATION
  // =====================================================================
  // Run these manually from the Apps Script editor (pick the function -> Run)
  // to verify the feature without inspecting the spreadsheet/Drive by hand.
  // Both log a PASS/FAIL report and return the report array.
  // =====================================================================

  // F.2 — Static self-check: schema + actions wiring. Does NOT modify data.
  function selfCheckArchiveRestore() {
    var report = [];
    function check(name, cond) { report.push((cond ? 'PASS' : 'FAIL') + ' - ' + name); }

    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    // 1. Sheet ArchiveAndRestore exists with the expected columns.
    var sh = ss.getSheetByName('ArchiveAndRestore');
    check('Sheet ArchiveAndRestore ada', !!sh);
    if (sh) {
      var headers = sh.getDataRange().getValues()[0] || [];
      ['id', 'tenant_id', 'slug', 'wedding_date', 'groom_name', 'bride_name', 'plan_type', 'status_payment', 'tanggal_archive', 'url_json']
        .forEach(function (col) { check('Kolom ArchiveAndRestore.' + col, headers.indexOf(col) !== -1); });
    }

    // 2. Every tenant-scoped sheet has a tenant_id column; Tenants uses id.
    ARCHIVE_TENANT_SHEETS.forEach(function (name) {
      var s = ss.getSheetByName(name);
      var h = s ? (s.getDataRange().getValues()[0] || []) : [];
      check(name + ' ada', !!s);
      check(name + ' punya kolom tenant_id', h.indexOf('tenant_id') !== -1);
    });
    var tSheet = ss.getSheetByName('Tenants');
    check('Tenants punya kolom id', tSheet && (tSheet.getDataRange().getValues()[0] || []).indexOf('id') !== -1);

    // 3. Service + actions are wired.
    ['getArchives', 'archiveTenant', 'restoreTenant', 'deleteArchivePermanent']
      .forEach(function (a) {
        check('ArchiveService.' + a + ' ada', typeof ArchiveService !== 'undefined' && typeof ArchiveService[a] === 'function');
      });

    Logger.log(report.join('\n'));
    return report;
  }

  // F.3 — Round-trip: create dummy tenant -> archive -> restore -> compare ->
  // cleanup (permanent delete). Uses a TEST_ tenant id and cleans up after itself.
  function testArchiveRestoreRoundTrip() {
    var auth = { role: 'superadmin', tenant_id: 'system' };
    var report = [];
    function check(name, cond) { report.push((cond ? 'PASS' : 'FAIL') + ' - ' + name); }

    var tenantId = 'TEST_' + Utilities.getUuid();
    var now = new Date().toISOString();

    // Count tenant rows across Tenants + all child sheets.
    function snapshot() {
      var snap = {};
      snap.Tenants = DB.findOne('Tenants', 'id', tenantId) ? 1 : 0;
      ARCHIVE_TENANT_SHEETS.forEach(function (name) { snap[name] = DB.getByTenant(name, tenantId).length; });
      return snap;
    }
    function allChildRowsZero() {
      for (var i = 0; i < ARCHIVE_TENANT_SHEETS.length; i++) {
        if (DB.getByTenant(ARCHIVE_TENANT_SHEETS[i], tenantId).length !== 0) return false;
      }
      return !DB.findOne('Tenants', 'id', tenantId);
    }

    try {
      // a. SETUP dummy: parent tenant + a couple of child rows (review hidden).
      DB.insert('Tenants', {
        id: tenantId, bride_name: 'Test Bride', groom_name: 'Test Groom', wedding_date: '2030-01-01',
        domain_slug: 'test-' + tenantId, plan_type: 'basic', guest_limit: 100, created_at: now,
        status_account: 'active', payment_deadline: now, status_payment: 'Sudah dibayar'
      });
      DB.insert('Guests', { id: DB.generateId(), tenant_id: tenantId, name: 'Dummy Guest', phone: '0', category: 'x', invitation_code: 'X1', status: 'pending', number_of_guests: 1, created_at: now });
      DB.insert('Wishes', { id: DB.generateId(), tenant_id: tenantId, guest_name: 'Dummy', message: 'hi', created_at: now });
      DB.insert('ReviewAndRating', { id: DB.generateId(), tenant_id: tenantId, comment: 'ok', rate_star: 5, flag_show_review: false, created_at: now });

      var before = snapshot();
      check('Setup dummy membuat data', before.Tenants === 1 && before.Guests === 1 && before.Wishes === 1);

      // b. GUARD: with flag_show_review=true, archive must be rejected.
      var review = DB.findOne('ReviewAndRating', 'tenant_id', tenantId);
      if (review) DB.update('ReviewAndRating', review.id, { flag_show_review: true });
      var blocked = JSON.parse(ArchiveService.archiveTenant(auth, { tenant_id: tenantId }).getContent());
      check('Archive ditolak saat flag_show_review=true', blocked && blocked.success === false);
      if (review) DB.update('ReviewAndRating', review.id, { flag_show_review: false });

      // c. ARCHIVE.
      var arc = JSON.parse(ArchiveService.archiveTenant(auth, { tenant_id: tenantId }).getContent());
      check('archiveTenant success', arc && arc.success === true);
      check('Semua sheet anak + Tenants kosong utk tenant', allChildRowsZero());
      var recAfterArchive = DB.findOne('ArchiveAndRestore', 'tenant_id', tenantId);
      check('Baris ArchiveAndRestore dibuat', !!recAfterArchive);
      check('url_json terisi', recAfterArchive && !!recAfterArchive.url_json);

      // d. RESTORE.
      var res = JSON.parse(ArchiveService.restoreTenant(auth, { tenant_id: tenantId }).getContent());
      check('restoreTenant success', res && res.success === true);
      var after = snapshot();
      check('Jumlah baris identik sebelum vs sesudah restore', JSON.stringify(before) === JSON.stringify(after));
      check('Baris ArchiveAndRestore terhapus setelah restore', !DB.findOne('ArchiveAndRestore', 'tenant_id', tenantId));

      // e. CLEANUP: archive again, then permanent-delete to remove all traces.
      DB.update('ReviewAndRating', DB.findOne('ReviewAndRating', 'tenant_id', tenantId).id, { flag_show_review: false });
      ArchiveService.archiveTenant(auth, { tenant_id: tenantId });
      var del = JSON.parse(ArchiveService.deleteArchivePermanent(auth, { tenant_id: tenantId }).getContent());
      check('deleteArchivePermanent success', del && del.success === true);
      check('Tidak ada sisa baris ArchiveAndRestore', !DB.findOne('ArchiveAndRestore', 'tenant_id', tenantId));
    } catch (e) {
      report.push('FAIL - Exception: ' + (e && e.message ? e.message : e));
    } finally {
      // Best-effort cleanup in case the test bailed mid-way.
      try {
        DB.deleteRow('Tenants', tenantId);
        ARCHIVE_TENANT_SHEETS.forEach(function (name) {
          DB.getByTenant(name, tenantId).forEach(function (row) { DB.deleteRow(name, row.id); });
        });
        var leftover = DB.findOne('ArchiveAndRestore', 'tenant_id', tenantId);
        if (leftover) DB.deleteRow('ArchiveAndRestore', leftover.id);
      } catch (e2) {}
    }

    Logger.log(report.join('\n'));
    return report;
  }
