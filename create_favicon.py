import struct

# Criar um favicon.ico simples com círculo laranja da Hotmart
# Formato ICO básico para 16x16 pixels

# Header ICO
ico_header = struct.pack('<HHH', 0, 1, 1)  # Reserved, Type, Count

# Directory entry  
width = 16
height = 16
colors = 0
reserved = 0
planes = 1
bit_count = 32
size_bytes = 16 * 16 * 4 + 40  # pixels * 4 bytes + header
offset = 22  # header(6) + directory(16)

ico_dir = struct.pack('<BBBBHHLL', width, height, colors, reserved, planes, bit_count, size_bytes, offset)

# Bitmap header (BITMAPINFOHEADER)
bmp_header = struct.pack('<LLLHHLLLLLL', 
    40,        # header size
    16,        # width
    32,        # height (doubled for ICO format)
    1,         # planes
    32,        # bits per pixel
    0,         # compression
    16*16*4,   # image size
    0, 0, 0, 0 # other fields
)

# Criar pixels com círculo laranja (FF4000) em fundo transparente
pixels = []
center_x, center_y = 8, 8
radius = 7

for y in range(15, -1, -1):  # ICO format stores bottom-up
    for x in range(16):
        distance = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
        if distance <= radius:
            # Pixel laranja da Hotmart  
            pixels.extend([0x00, 0x40, 0xFF, 0xFF])  # BGRA format
        else:
            # Pixel transparente
            pixels.extend([0x00, 0x00, 0x00, 0x00])

# AND mask (all zeros for 32-bit images)
and_mask = [0] * (16 * 4)  # 16 rows of 4 bytes each

# Combinar tudo
ico_data = ico_header + ico_dir + bmp_header + bytes(pixels) + bytes(and_mask)

# Salvar arquivo
with open('public/favicon.ico', 'wb') as f:
    f.write(ico_data)

print('Favicon.ico criado com sucesso!')
