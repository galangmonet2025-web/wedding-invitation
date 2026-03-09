import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Load ENV variables (adjust path as needed, Vite usually puts them in import.meta.env or .env)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
let API_URL = '';

if (fs.existsSync(envPath)) {
    const envData = fs.readFileSync(envPath, 'utf8');
    const match = envData.match(/VITE_API_URL=(.+)/);
    if (match) API_URL = match[1].trim();
}

if (!API_URL) {
    console.warn("No VITE_API_URL found in .env, using default development url");
    API_URL = 'https://script.google.com/macros/s/AKfycbzQhFikYOf7I4o1pXvANd7X-uC4G0hZ-g4aX2rNpxZ1X8LIfY_kHqVEXD_i4_a9TfEIFw/exec'; // Try to get the real one from your api client later if needed. But for this specific tenant, we can use Superadmin dummy bypass
}

const SUPERADMIN_TOKEN = 'dummy-superadmin-token'; // Using the bypass configured in Code.gs

async function updateThemes() {
    console.log("Fetching all themes...");
    
    try {
        // GET Themes
        const getRes = await axios.post(API_URL, {
            action: 'getThemes',
            token: SUPERADMIN_TOKEN
        });

        if (!getRes.data || !getRes.data.success) {
            console.error("Failed to fetch themes", getRes.data);
            return;
        }

        const themes = getRes.data.data;
        console.log(`Found ${themes.length} themes. Processing...`);

        // Update Theme Logic
        for (const theme of themes) {
            let html = theme.html_template || "";

            // Check if it already has timeline logic
            if (html.includes('timeline_kisah')) {
                console.log(`Theme '${theme.name}' already has timeline logic. Skipping...`);
                continue;
            }

            console.log(`Updating theme '${theme.name}'...`);

            // Find a good place to inject the timeline. Let's look for standard sections or just append it before closing body/container
            // We'll inject an elegant timeline block.
            const timelineHtml = `
  <!-- Timeline Kisah Section (Dynamic) -->
  {{#if flag_pakai_timeline_kisah}}
    <section id="timeline" class="uk-section uk-section-muted">
        <div class="uk-container uk-container-small text-center mb-5">
            <h2 class="uk-margin-remove" style="font-family: 'Playfair Display', serif;">Perjalanan Cinta Kami</h2>
            <div style="width: 50px; height: 2px; background-color: #d4af37; margin: 15px auto;"></div>
        </div>
        <div class="uk-container uk-container-small">
            <div class="uk-position-relative">
                <!-- Timeline Line -->
                <div class="uk-position-absolute" style="left: 50%; top: 0; bottom: 0; width: 2px; background: #e5e7eb; transform: translateX(-50%);"></div>
                
                <div class="uk-grid-match uk-child-width-1-2@m" uk-grid>
                    {{#each timeline_kisah}}
                    <div class="uk-width-1-1 uk-margin-large-bottom">
                        <div class="uk-card uk-card-default uk-card-body uk-card-small uk-border-rounded uk-box-shadow-medium uk-position-relative uk-width-1-2@m" style="margin: 0 auto; z-index: 10;">
                            <div class="uk-position-absolute uk-border-circle" style="width: 16px; height: 16px; background: #d4af37; top: 20px; left: -38px; border: 4px solid white; box-shadow: 0 0 0 2px #d4af37;"></div>
                            <span class="uk-text-meta uk-text-primary" style="color: #d4af37; font-weight: 600;">{{this.tanggal}}</span>
                            <h4 class="uk-margin-small-top uk-margin-small-bottom" style="font-family: 'Playfair Display', serif; font-size: 1.2rem;">{{this.judul}}</h4>
                            <p class="uk-text-small uk-margin-remove">{{this.deskripsi}}</p>
                        </div>
                    </div>
                    {{/each}}
                </div>
            </div>
        </div>
    </section>
  {{/if}}
            `;

            // If it's a known theme from seed.js we know where to append it
            let updatedHtml = html;
            
            // Try injecting right before Gallery, Wishes, or Gift section if exist, else before bottom
            if (updatedHtml.includes('id="gallery"')) {
                updatedHtml = updatedHtml.replace('<section id="gallery"', timelineHtml + '\n  <section id="gallery"');
            } else if (updatedHtml.includes('id="wishes"')) {
                 updatedHtml = updatedHtml.replace('<section id="wishes"', timelineHtml + '\n  <section id="wishes"');
            } else if (updatedHtml.includes('id="gift"')) {
                updatedHtml = updatedHtml.replace('<section id="gift"', timelineHtml + '\n  <section id="gift"');
            } else if (updatedHtml.includes('</body>')) {
                 updatedHtml = updatedHtml.replace('</body>', timelineHtml + '\n</body>');
            } else {
                 updatedHtml += timelineHtml;
            }

            // PUT Data
            const putRes = await axios.post(API_URL, {
                action: 'updateTheme',
                token: SUPERADMIN_TOKEN,
                id: theme.id,
                name: theme.name,
                html_template: updatedHtml,
                css_template: theme.css_template,
                js_template: theme.js_template,
                plan_type: theme.plan_type,
                preview_image: theme.preview_image
            });

            if (putRes.data && putRes.data.success) {
                console.log(`Successfully updated theme '${theme.name}'`);
            } else {
                console.error(`Error updating theme '${theme.name}'`, putRes.data);
            }
        }

        console.log("All themes checked/updated.");

    } catch (error) {
        console.error("Script failed", error.message);
    }
}

updateThemes();
