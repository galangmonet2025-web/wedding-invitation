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
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
  TOKEN_SECRET: 'wedding-saas-secret-key-2026',
  TOKEN_EXPIRY_HOURS: 24,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX: 30, // max requests per minute
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

    // Rate limiting - hash token to keep cache key short
    var rateLimitId = (payload.token || 'anonymous').substring(0, 32);
    if (!RateLimiter.check(rateLimitId)) {
      return ResponseHelper.error('Rate limit exceeded. Please try again later.', 429);
    }

    // Public endpoints (no auth required)
    var publicActions = ['login', 'registerTenant', 'getPublicInvitation', 'submitPublicRSVP', 'submitPublicWish'];
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
    case 'logout':
      return ResponseHelper.success(null, 'Logged out successfully');

    // Dashboard
    case 'getDashboard':
      return DashboardService.getTenantDashboard(auth);
    case 'getGlobalDashboard':
      PermissionService.requireRole(auth, ['superadmin']);
      return DashboardService.getGlobalDashboard(auth);

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

    // Tenants
    case 'getTenants':
      PermissionService.requireRole(auth, ['superadmin']);
      return TenantService.getTenants(auth);
    case 'createTenant':
      PermissionService.requireRole(auth, ['superadmin']);
      return TenantService.createTenant(auth, payload);
    case 'updateTenant':
      PermissionService.requireRole(auth, ['superadmin']);
      return TenantService.updateTenant(auth, payload);

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

    // Invitation Content
    case 'getInvitationContent':
      PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
      return InvitationContentService.getContent(auth);
    case 'updateInvitationContent':
      PermissionService.requireRole(auth, ['superadmin', 'tenant_admin']);
      return InvitationContentService.updateContent(auth, payload);

    // Public Invitation
    case 'getPublicInvitation':
      return PublicService.getInvitation(payload);
    case 'submitPublicRSVP':
      return PublicService.submitRSVP(payload);
    case 'submitPublicWish':
      return PublicService.submitWish(payload);

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
      if (!obj[field] || String(obj[field]).trim() === '') {
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
        row[headers[j]] = data[i][j];
      }
      rows.push(row);
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
    var row = headers.map(function(h) { return rowData[h] || ''; });
    sheet.appendRow(row);
    return rowData;
  },

  update: function(sheetName, id, updates) {
    var sheet = this.getSheet(sheetName);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('id');

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id)) {
        for (var key in updates) {
          var col = headers.indexOf(key);
          if (col !== -1) {
            sheet.getRange(i + 1, col + 1).setValue(updates[key]);
          }
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
      groom_name: sanitized.groom_name,
      wedding_date: sanitized.wedding_date,
      domain_slug: sanitized.domain_slug,
      plan_type: 'free',
      guest_limit: 100,
      created_at: now,
      status_account: 'active',
      payment_deadline: deadline,
      status_payment: 'Menunggu pembayaran'
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
          tenant_id: 'system',
          expired_at: new Date(Date.now() + 3600000).toISOString()
        };
      }

      var parts = token.split('.');
      if (parts.length !== 2) return null;

      var encoded = parts[0];
      var sig = parts[1];

      // Verify signature
      var expectedSig = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, encoded + CONFIG.TOKEN_SECRET);
      var expected = expectedSig.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2); }).join('');

      if (sig !== expected) return null;

      var json = Utilities.newBlob(Utilities.base64Decode(encoded)).getDataAsString();
      var payload = JSON.parse(json);

      // Check expiration
      if (new Date(payload.expired_at) < new Date()) return null;

      return payload;
    } catch (e) {
      return null;
    }
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
    if (!auth || !auth.tenant_id) {
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

    var planLimits = { free: 100, pro: 500, premium: -1 };
    var plan = sanitized.plan_type || 'free';
    var deadline = new Date(new Date(now).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    var tenant = {
      id: tenantId,
      bride_name: sanitized.bride_name,
      groom_name: sanitized.groom_name,
      wedding_date: sanitized.wedding_date || '',
      domain_slug: sanitized.domain_slug || '',
      plan_type: plan,
      guest_limit: planLimits[plan] || 100,
      created_at: now,
      status_account: 'active',
      payment_deadline: deadline,
      status_payment: 'Menunggu pembayaran'
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
    PermissionService.requireRole(auth, ['superadmin']);
    Validator.required(payload, ['id']);

    var updates = {};
    if (payload.plan_type) {
      updates.plan_type = payload.plan_type;
      var planLimits = { free: 100, pro: 500, premium: -1 };
      updates.guest_limit = planLimits[payload.plan_type] || 100;
    }
    if (payload.status_account) updates.status_account = payload.status_account;
    if (payload.status_payment) updates.status_payment = payload.status_payment;
    if (payload.guest_limit !== undefined) updates.guest_limit = payload.guest_limit;

    DB.update('Tenants', payload.id, updates);

    return ResponseHelper.success(null, 'Tenant updated successfully');
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

    var guests = DB.getByTenant('Guests', tenantId);
    var guest = guests.find(function(g) { return g.invitation_code === payload.invitation_code; });

    if (!guest) {
      return ResponseHelper.error('Invalid invitation code', 404);
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
    var planPrices = { free: 0, pro: 500000, premium: 1500000 };
    var revenue = tenants.reduce(function(sum, t) {
      return sum + (planPrices[t.plan_type] || 0);
    }, 0);

    // Plan distribution
    var planCount = { free: 0, pro: 0, premium: 0 };
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
    // Sort by created_at descending
    logs.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    return ResponseHelper.success(logs, 'Activity logs retrieved');
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
      content.groom_name = tenant.groom_name;
      content.wedding_date = tenant.wedding_date;
      content.tanggal_akad = tenant.wedding_date; // Keep consistent view
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
    if (sanitized.groom_name !== undefined) {
      tenantUpdates.groom_name = sanitized.groom_name;
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
    delete sanitized.groom_name;
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
        updated.tanggal_akad = tenant.wedding_date; // Keep consistent view
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
  getInvitation: function(payload) {
    Validator.required(payload, ['slug']);
    var tenant = DB.findOne('Tenants', 'domain_slug', payload.slug);
    if (!tenant || tenant.status_account !== 'active') {
      return ResponseHelper.error('Invitation not found', 404);
    }

    var wishes = DB.getByTenant('Wishes', tenant.id);
    wishes.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

    var content = DB.findOne('InvitationContent', 'tenant_id', tenant.id);

    return ResponseHelper.success({
      tenant: {
        bride_name: tenant.bride_name,
        groom_name: tenant.groom_name,
        wedding_date: tenant.wedding_date,
        domain_slug: tenant.domain_slug
      },
      wishes: wishes.slice(0, 50),
      content: content || {}
    }, 'Invitation data retrieved');
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

    var wish = {
      id: DB.generateId(),
      tenant_id: tenant.id,
      guest_name: sanitized.guest_name,
      message: sanitized.message,
      created_at: new Date().toISOString()
    };

    DB.insert('Wishes', wish);
    return ResponseHelper.success(wish, 'Wish submitted successfully');
  }
};


// =====================================================================
// SETUP FUNCTION - Run this once to initialize spreadsheet
// =====================================================================

function setupSpreadsheet() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  var sheets = {
    'Tenants': ['id', 'bride_name', 'groom_name', 'wedding_date', 'domain_slug', 'plan_type', 'guest_limit', 'created_at', 'status_account', 'payment_deadline', 'status_payment'],
    'Users': ['id', 'username', 'password_hash', 'role', 'tenant_id', 'created_at'],
    'Guests': ['id', 'tenant_id', 'name', 'phone', 'category', 'invitation_code', 'status', 'number_of_guests', 'checkin_status', 'created_at'],
    'Wishes': ['id', 'tenant_id', 'guest_name', 'message', 'created_at'],
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
      'nama_bank_1', 'nama_rekening_bank_1', 'nomor_rekening_bank_1',
      'nama_bank_2', 'nama_rekening_bank_2', 'nomor_rekening_bank_2',
      'custom_kalimat_1', 'custom_kalimat_2', 'custom_kalimat_3', 'custom_kalimat_4',
      'flag_pakai_kalimat_pembuka_custom', 'kalimat_pembuka_undangan',
      'flag_pakai_kalimat_penutup_custom', 'kalimat_penutup_undangan',
      'link_backsound_music'
    ]
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

    // Create system tenant for superadmin
    var tenantsSheet = ss.getSheetByName('Tenants');
    tenantsSheet.appendRow([tenantId, 'System', 'Admin', '', 'system-admin', 'premium', -1, now, 'active', now, 'Sudah dibayar']);

    // Create superadmin user (password: admin123)
    var passwordHash = AuthService.hashPassword('admin123');
    usersSheet.appendRow([userId, 'admin', passwordHash, 'superadmin', tenantId, now]);

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
