const { readdirSync, statSync, writeFileSync } = require('fs');
const { join, extname, basename } = require('path');

const IMAGES_DIR = join(__dirname, 'imagens');
const OUTPUT_FILE = join(__dirname, 'gallery_data.js');

const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];

const gallery = {
    trails: {},
    videos: [],
    allPhotos: []
};

function exploreDir(dirPath, trailName = null) {
    const items = readdirSync(dirPath);

    for (const item of items) {
        const fullPath = join(dirPath, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            const newTrailName = trailName || item;
            exploreDir(fullPath, newTrailName);
        } else {
            const ext = extname(item).toLowerCase();
            const relPath = fullPath.replace(__dirname + '\\', '').replace(/\\/g, '/');

            if (VIDEO_EXTS.includes(ext)) {
                gallery.videos.push({
                    path: relPath,
                    trail: trailName || 'Diversos',
                    name: item
                });
            } else if (PHOTO_EXTS.includes(ext)) {
                const photoObj = {
                    path: relPath,
                    trail: trailName || 'Diversos',
                    name: item
                };
                gallery.allPhotos.push(photoObj);

                if (!gallery.trails[photoObj.trail]) {
                    gallery.trails[photoObj.trail] = [];
                }
                gallery.trails[photoObj.trail].push(photoObj);
            }
        }
    }
}

try {
    exploreDir(IMAGES_DIR);
    
    // Create highly optimized grouping
    let dataScript = `const galleryData = ${JSON.stringify(gallery, null, 2)};`;
    writeFileSync(OUTPUT_FILE, dataScript);
    console.log('✅ Base de dados do álbum foi gerada com sucesso em gallery_data.js!');
    console.log(`Total Fotos: ${gallery.allPhotos.length}`);
    console.log(`Total Vídeos: ${gallery.videos.length}`);
} catch (e) {
    console.error('Erro ao processar as pastas:', e);
}
