const { readdirSync, statSync, writeFileSync, mkdirSync, existsSync, copyFileSync } = require('fs');
const { join, extname } = require('path');
const { execSync } = require('child_process');

// Tentando instalar Sharp silenciosamente para comprimir
try {
    console.log('Instalando sharp...');
    execSync('npm install sharp --no-save', { stdio: 'ignore' });
} catch (e) {
    console.error('Falha ao instalar sharp');
}

const sharp = require('sharp');

const IMAGES_DIR = join(__dirname, 'imagens');
const COMPRESSED_DIR = join(__dirname, 'imagens_comprimidas');
const OUTPUT_FILE = join(__dirname, 'gallery_data.js');

if (!existsSync(COMPRESSED_DIR)) mkdirSync(COMPRESSED_DIR);

const VIDEO_EXTS = ['.mp4', '.mov', '.avi'];
const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];

const gallery = { trails: {}, videos: [], allPhotos: [] };

async function processImages() {
    console.log('Iniciando compressão extrema...');
    const trailsDirs = readdirSync(IMAGES_DIR);

    for (const trail of trailsDirs) {
        const trailPath = join(IMAGES_DIR, trail);
        if (!statSync(trailPath).isDirectory()) continue;

        const outTrailDir = join(COMPRESSED_DIR, trail);
        if (!existsSync(outTrailDir)) mkdirSync(outTrailDir, { recursive: true });

        // Acessa as subpastas ou fotos diretas
        const items = readdirSync(trailPath);
        for (const item of items) {
            const itemPath = join(trailPath, item);
            if (statSync(itemPath).isDirectory()) {
                const subItems = readdirSync(itemPath);
                
                const outSubDir = join(outTrailDir, item);
                if (!existsSync(outSubDir)) mkdirSync(outSubDir, { recursive: true });

                for(const sub of subItems) {
                    await processFile(join(itemPath, sub), outSubDir, sub, trail, join(trail, item, sub));
                }
            } else {
                await processFile(itemPath, outTrailDir, item, trail, join(trail, item));
            }
        }
    }

    // Gerando o banco atualizado apontando para pastas comprimidas
    let dataScript = `const galleryData = ${JSON.stringify(gallery, null, 2)};`;
    writeFileSync(OUTPUT_FILE, dataScript);
    console.log('✅ Compressão finalizada com sucesso!');
}

async function processFile(fullPath, outDir, fileName, trailName, relStorePath) {
    const ext = extname(fileName).toLowerCase();
    
    // Substituir .JPG por .webp no filename se for foto
    let finalFileName = fileName;
    let finalRelPath = 'imagens_comprimidas/' + relStorePath.replace(/\\/g, '/');

    if (PHOTO_EXTS.includes(ext)) {
        finalFileName = fileName.replace(ext, '.webp');
        finalRelPath = finalRelPath.replace(ext, '.webp');
        const outFilePath = join(outDir, finalFileName);

        try {
            await sharp(fullPath)
                .resize({ width: 800, withoutEnlargement: true }) // Reduz largura max 800px
                .webp({ quality: 60 }) // Super compressão WebP
                .toFile(outFilePath);
            
            const photoObj = { path: finalRelPath, trail: trailName, name: finalFileName };
            gallery.allPhotos.push(photoObj);
            if (!gallery.trails[trailName]) gallery.trails[trailName] = [];
            gallery.trails[trailName].push(photoObj);
        } catch (err) {
             console.error('Erro na foto: ', fileName);
        }

    } else if (VIDEO_EXTS.includes(ext)) {
        // Videos são dificeis de comprimir sem ffmpeg nativo, apenas copia se for pqn
        try {
            const stat = statSync(fullPath);
            if (stat.size < 20000000) { // Só copia < 20MB para não travar
                copyFileSync(fullPath, join(outDir, fileName));
                gallery.videos.push({ path: finalRelPath, trail: trailName, name: fileName });
            } else {
                console.log(`Video muito grande ignorado: ${fileName}`);
            }
        } catch (e) {}
    }
}

processImages();
