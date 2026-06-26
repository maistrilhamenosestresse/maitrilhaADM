const { readdirSync, statSync, writeFileSync, copyFileSync, existsSync, mkdirSync } = require('fs');
const { join, extname } = require('path');

const ORIG_DIR = join(__dirname, 'imagens');
const OPTIM_DIR = join(__dirname, 'fotos_otimizadas');
const OUTPUT_FILE = join(__dirname, 'ai_gallery_data.js');

const PHOTO_EXTS = ['.webp']; // No otimizado tudo vira webp
const VIDEO_EXTS = ['.mp4', '.mov', '.avi'];

const gallery = {
    trails: {},
    videos: [],
    categories: { people: [], landscape: [] },
    allPhotos: []
};

// Pular videos gigantes ou problemáticos
const VIDEO_BLACKLIST = ['53B16B23-6929-4CAE-A01E-2BA6BE08C270.MP4', 'DA3540B5-E748-48AF-9937-57AB3C0BD171.MP4'];

function processOptimized() {
    if (!existsSync(OPTIM_DIR)) return;

    function explore(dirPath, trailName = null) {
        const items = readdirSync(dirPath);
        for (const item of items) {
            const full = join(dirPath, item);
            const stat = statSync(full);

            if (stat.isDirectory()) {
                explore(full, trailName || item);
            } else {
                const ext = extname(item).toLowerCase();
                const lowName = item.toLowerCase();

                // DEDUPLICAÇÃO: Ignora cópias óbvias
                if (lowName.includes('copy') || lowName.includes(' (1)') || lowName.includes('-1.webp')) {
                    continue;
                }

                if (PHOTO_EXTS.includes(ext)) {
                    const relPath = full.replace(__dirname + '\\', '').replace(/\\/g, '/');
                    const photoObj = { path: relPath, trail: trailName || 'Geral', name: item };
                    
                    // Prevenir duplicados no array global
                    if (!gallery.allPhotos.some(p => p.name === item)) {
                        gallery.allPhotos.push(photoObj);

                        if (!gallery.trails[photoObj.trail]) gallery.trails[photoObj.trail] = [];
                        gallery.trails[photoObj.trail].push(photoObj);

                        // Categorização simples
                        if (item.includes('IMG_') || item.match(/[0-9]{5,}/)) {
                            gallery.categories.people.push(photoObj);
                        } else {
                            gallery.categories.landscape.push(photoObj);
                        }
                    }
                }
            }
        }
    }
    explore(OPTIM_DIR);
}

function processVideos() {
    function explore(dirPath, trailName = null) {
        const items = readdirSync(dirPath);
        for (const item of items) {
            const full = join(dirPath, item);
            const stat = statSync(full);

            if (stat.isDirectory()) {
                explore(full, trailName || item);
            } else {
                const ext = extname(item).toLowerCase();
                if (VIDEO_EXTS.includes(ext)) {
                    if (VIDEO_BLACKLIST.includes(item.toUpperCase())) continue;
                    if (stat.size > 90 * 1024 * 1024) continue; // Mais de 90MB pula

                    // Copiar video para a pasta otimizada para garantir que ele suba pro Vercel
                    const outTrailDir = join(OPTIM_DIR, trailName || 'Geral');
                    if (!existsSync(outTrailDir)) mkdirSync(outTrailDir, { recursive: true });
                    
                    const outFilePath = join(outTrailDir, item);
                    if (!existsSync(outFilePath)) {
                        console.log(`Copiando vídeo: ${item}`);
                        copyFileSync(full, outFilePath);
                    }

                    const relPath = outFilePath.replace(__dirname + '\\', '').replace(/\\/g, '/');
                    gallery.videos.push({ path: relPath, trail: trailName || 'Geral', name: item });
                }
            }
        }
    }
    explore(ORIG_DIR);
}

try {
    processVideos(); // Primeiro videos para copiar
    processOptimized(); // Depois fotos
    
    // Fallbacks
    if (gallery.categories.landscape.length < 5) gallery.categories.landscape = gallery.allPhotos.slice(0, 10);
    if (gallery.categories.people.length === 0) gallery.categories.people = gallery.allPhotos;

    writeFileSync(OUTPUT_FILE, `const galleryData = ${JSON.stringify(gallery, null, 2)};`);
    console.log("✅ Banco de dados RECONSTRUÍDO com fotos leves e vídeos funcionais!");
} catch (e) {
    console.error(e);
}
