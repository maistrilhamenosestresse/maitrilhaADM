import os
import sys
from PIL import Image, ImageOps

# Forçar instalação se necessário
try:
    import PIL
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "pillow-heif"])
    from PIL import Image, ImageOps
    import pillow_heif
    pillow_heif.register_heif_opener()

def optimize_all(input_dir, output_dir, max_width=1080):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    supported_formats = ('.jpg', '.jpeg', '.png', '.heic', '.webp')
    count = 0

    for root, dirs, files in os.walk(input_dir):
        for file in files:
            # Pular duplicatas comuns pelo nome
            low_file = file.lower()
            if "copy" in low_file or " (1)" in low_file or "-1.jpg" in low_file:
                print(f"⏩ Pulando duplicata: {file}")
                continue

            if low_file.endswith(supported_formats):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, input_dir)
                out_path = os.path.join(output_dir, rel_path)
                
                # Sempre salvar como .webp para performance máxima
                name_without_ext = os.path.splitext(out_path)[0]
                out_path = name_without_ext + '.webp'

                out_dir_path = os.path.dirname(out_path)
                if not os.path.exists(out_dir_path):
                    os.makedirs(out_dir_path)

                try:
                    with Image.open(file_path) as img:
                        # CORREÇÃO DE ROTAÇÃO: Lê o EXIF e gira a foto se necessário
                        img = ImageOps.exif_transpose(img)

                        # Converte para RGB
                        if img.mode in ("RGBA", "P", "CMYK"):
                            img = img.convert("RGB")
                        
                        # Resize mantendo proporção
                        if img.width > max_width:
                            w_percent = (max_width / float(img.width))
                            h_size = int((float(img.height) * float(w_percent)))
                            img = img.resize((max_width, h_size), Image.Resampling.LANCZOS)
                        
                        img.save(out_path, format="WEBP", quality=75)
                        count += 1
                        print(f"[{count}] Otimizada & Corrigida: {os.path.basename(out_path)}")
                except Exception as e:
                    print(f"Falha em {file}: {e}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    img_dir = os.path.join(current_dir, 'imagens')
    out_dir = os.path.join(current_dir, 'fotos_otimizadas')
    print("🚀 Iniciando Otimização Extrema das Fotos...")
    optimize_all(img_dir, out_dir)
    print("✅ Todas as fotos foram reduzidas e otimizadas!")
