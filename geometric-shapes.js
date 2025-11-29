// TE-style Pixelated Animation
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pixelCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // TE Colors
    const colors = ['#ff6600', '#ff0000', '#ffcc00', '#ff8833', '#ffaa00', '#000000'];
    
    // Pixel size for retro look - bigger pixels for more retro feel
    const pixelSize = 16;
    const gridWidth = Math.floor(canvas.width / pixelSize);
    const gridHeight = Math.floor(canvas.height / pixelSize);
    
    // Animated shapes
    class PixelShape {
        constructor() {
            this.x = Math.floor(Math.random() * gridWidth);
            this.y = Math.floor(Math.random() * gridHeight);
            this.size = Math.floor(Math.random() * 6) + 3; // Smaller relative sizes
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.speedX = Math.random() > 0.5 ? 0.15 : -0.15; // Grid-locked movement
            this.speedY = Math.random() > 0.5 ? 0.15 : -0.15;
            this.type = Math.floor(Math.random() * 5); // 0: square, 1: circle, 2: L-shape, 3: T-shape, 4: plus
            this.rotation = Math.floor(Math.random() * 4) * 90; // Only 90 degree rotations
            this.rotationSpeed = 0; // No smooth rotation, only snapped
            this.moveCounter = 0;
        }
        
        update() {
            this.moveCounter++;
            
            // Move in grid steps
            if (this.moveCounter % 30 === 0) {
                this.x = Math.floor(this.x + this.speedX);
                this.y = Math.floor(this.y + this.speedY);
                
                // Occasionally change direction
                if (Math.random() > 0.95) {
                    this.speedX = Math.random() > 0.5 ? 0.15 : -0.15;
                    this.speedY = Math.random() > 0.5 ? 0.15 : -0.15;
                }
            }
            
            // Wrap around edges
            if (this.x < -this.size) this.x = gridWidth + this.size;
            if (this.x > gridWidth + this.size) this.x = -this.size;
            if (this.y < -this.size) this.y = gridHeight + this.size;
            if (this.y > gridHeight + this.size) this.y = -this.size;
        }
        
        draw() {
            const centerX = Math.floor(this.x) * pixelSize;
            const centerY = Math.floor(this.y) * pixelSize;
            
            ctx.fillStyle = this.color;
            
            const s = this.size;
            const px = pixelSize;
            
            // Draw pixel-perfect shapes
            switch(this.type) {
                case 0: // Square
                    for (let i = 0; i < s; i++) {
                        for (let j = 0; j < s; j++) {
                            ctx.fillRect(centerX + i * px, centerY + j * px, px, px);
                        }
                    }
                    break;
                    
                case 1: // Circle (8-bit style)
                    const pattern = [
                        [0,1,1,1,0],
                        [1,1,1,1,1],
                        [1,1,1,1,1],
                        [1,1,1,1,1],
                        [0,1,1,1,0]
                    ];
                    for (let i = 0; i < Math.min(5, s); i++) {
                        for (let j = 0; j < Math.min(5, s); j++) {
                            if (pattern[j] && pattern[j][i]) {
                                ctx.fillRect(centerX + i * px, centerY + j * px, px, px);
                            }
                        }
                    }
                    break;
                    
                case 2: // L-shape
                    for (let i = 0; i < s; i++) {
                        ctx.fillRect(centerX, centerY + i * px, px, px);
                        if (i === s - 1) {
                            for (let j = 0; j < s; j++) {
                                ctx.fillRect(centerX + j * px, centerY + i * px, px, px);
                            }
                        }
                    }
                    break;
                    
                case 3: // T-shape
                    for (let i = 0; i < s; i++) {
                        ctx.fillRect(centerX + i * px, centerY, px, px);
                    }
                    for (let j = 1; j < s; j++) {
                        ctx.fillRect(centerX + Math.floor(s/2) * px, centerY + j * px, px, px);
                    }
                    break;
                    
                case 4: // Plus/Cross
                    const mid = Math.floor(s / 2);
                    for (let i = 0; i < s; i++) {
                        ctx.fillRect(centerX + mid * px, centerY + i * px, px, px);
                        ctx.fillRect(centerX + i * px, centerY + mid * px, px, px);
                    }
                    break;
            }
        }
    }
    
    // Create shapes - more shapes for busier retro look
    const shapes = [];
    for (let i = 0; i < 20; i++) {
        shapes.push(new PixelShape());
    }
    
    // Grid pattern background - thicker grid
    function drawGrid() {
        ctx.strokeStyle = 'rgba(255, 102, 0, 0.08)';
        ctx.lineWidth = 2;
        
        // Vertical lines - more pronounced grid
        for (let x = 0; x < canvas.width; x += pixelSize * 8) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < canvas.height; y += pixelSize * 8) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Add some random "glitch" pixels
        if (Math.random() > 0.98) {
            const glitchX = Math.floor(Math.random() * gridWidth) * pixelSize;
            const glitchY = Math.floor(Math.random() * gridHeight) * pixelSize;
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillRect(glitchX, glitchY, pixelSize, pixelSize);
        }
    }
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        drawGrid();
        
        // Update and draw shapes
        shapes.forEach(shape => {
            shape.update();
            shape.draw();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
});
