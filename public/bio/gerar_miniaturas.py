import os
import sys
from PIL import Image

# Forçar instalação se não houver PIL
try:
    import PIL
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "pillow-heif"])
    from PIL import Image
    import pillow_heif
    pillow_heif.register_heif_opener()

def create_thumbnails(input_dir, output_dir, max_size=(500, 500)):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    supported_formats = ('.jpg', '.jpeg', '.png', '.heic', '.webp')
    count = 0

    for root, dirs, files in os.walk(input_dir):
        for file in files:
            if file.lower().endswith(supported_formats):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, input_dir)
                out_path = os.path.join(output_dir, rel_path)
                
                # Para evitar conflitos de extensões nos HEIC
                if file.lower().endswith('.heic'):
                    out_path = os.path.splitext(out_path)[0] + '.webp'
                else:
                    out_path = os.path.splitext(out_path)[0] + '.webp'

                out_dir_path = os.path.dirname(out_path)
                if not os.path.exists(out_dir_path):
                    os.makedirs(out_dir_path)

                try:
                    with Image.open(file_path) as img:
                        # Converte para RGB se for RGBA/CMYK
                        if img.mode in ("RGBA", "P", "CMYK"):
                            img = img.convert("RGB")
                        
                        img.thumbnail(max_size, Image.Resampling.LANCZOS)
                        img.save(out_path, format="WEBP", quality=50)
                        count += 1
                        print(f"[{count}] Gerado: {os.path.basename(out_path)}")
                except Exception as e:
                    print(f"Erro ao processar {file}: {e}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    img_dir = os.path.join(current_dir, 'imagens')
    thumb_dir = os.path.join(current_dir, 'thumbnails_para_ia')
    print("Iniciando geração de miniaturas para o Antigravity ler...")
    create_thumbnails(img_dir, thumb_dir)
    print("Concluído!")
