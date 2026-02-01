const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Canvas = require('canvas');

// ═══════════════════════════════════════════════════════════════
// 🎨 ULTRA HD 4K CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
    width: 1600,
    height: 800,
    quality: 'best'
};

// ═══════════════════════════════════════════════════════════════
// 🌈 CYBERPUNK NEON THEME - Premium Edition
// ═══════════════════════════════════════════════════════════════
const COLORS = {
    // Neon colors
    neonPink: '#ff0080',
    neonMagenta: '#ff006e',
    neonPurple: '#b026ff',
    neonBlue: '#00d4ff',
    neonCyan: '#00fff9',
    neonOrange: '#ff8c00',
    neonYellow: '#ffd700',
    neonRed: '#ff0040',
    
    // Backgrounds
    spaceDark: '#0a0014',
    spaceDeep: '#050008',
    purpleDark: '#1a0033',
    
    // UI Elements
    glass: 'rgba(255, 255, 255, 0.1)',
    glassBorder: 'rgba(255, 255, 255, 0.3)',
    darkOverlay: 'rgba(0, 0, 0, 0.7)',
    
    // Status colors
    gold: '#ffd700',
    white: '#ffffff'
};

// ═══════════════════════════════════════════════════════════════
// 🎨 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Round rectangle helper
 */
function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/**
 * Multi-layer glow effect
 */
function applyGlow(ctx, color, blur = 30, layers = 3) {
    for (let i = layers; i > 0; i--) {
        ctx.shadowBlur = blur * i;
        ctx.shadowColor = color;
    }
}

/**
 * Cosmic space background with stars
 */
function drawSpaceBackground(ctx) {
    // Base gradient
    const bgGrad = ctx.createRadialGradient(
        CONFIG.width / 2, CONFIG.height / 2, 0,
        CONFIG.width / 2, CONFIG.height / 2, CONFIG.width * 0.8
    );
    bgGrad.addColorStop(0, '#1a0033');
    bgGrad.addColorStop(0.5, '#0f001f');
    bgGrad.addColorStop(1, '#050008');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    
    // Stars - multiple layers
    ctx.save();
    const starColors = [COLORS.neonPink, COLORS.neonBlue, COLORS.neonCyan, COLORS.neonPurple, COLORS.neonOrange];
    
    for (let i = 0; i < 300; i++) {
        const x = Math.random() * CONFIG.width;
        const y = Math.random() * CONFIG.height;
        const size = Math.random() * 3;
        const color = starColors[Math.floor(Math.random() * starColors.length)];
        const alpha = 0.3 + Math.random() * 0.7;
        
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    
    // Nebula clouds
    ctx.save();
    const nebulaPositions = [
        { x: CONFIG.width * 0.2, y: CONFIG.height * 0.3 },
        { x: CONFIG.width * 0.8, y: CONFIG.height * 0.7 },
        { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5 }
    ];
    
    nebulaPositions.forEach(pos => {
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 400);
        grad.addColorStop(0, 'rgba(180, 38, 255, 0.15)');
        grad.addColorStop(0.5, 'rgba(255, 0, 128, 0.08)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 400, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
    
    // Floating icons (corners)
    const floatingIcons = [
        { icon: '💎', x: 150, y: 100, color: COLORS.neonCyan },
        { icon: '❄️', x: 430, y: 80, color: COLORS.neonBlue },
        { icon: '💎', x: CONFIG.width - 430, y: 80, color: COLORS.neonPurple },
        { icon: '🔥', x: CONFIG.width - 150, y: 100, color: COLORS.neonOrange },
        { icon: '💜', x: 70, y: CONFIG.height - 100, color: COLORS.neonPink },
        { icon: '♀', x: 130, y: CONFIG.height - 100, color: COLORS.neonMagenta },
        { icon: '💎', x: CONFIG.width - 150, y: CONFIG.height - 100, color: COLORS.neonCyan },
        { icon: '🔥', x: CONFIG.width - 70, y: CONFIG.height - 100, color: COLORS.neonOrange }
    ];
    
    ctx.font = 'bold 40px Arial';
    floatingIcons.forEach(({ icon, x, y, color }) => {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = color;
        ctx.fillText(icon, x, y);
        ctx.restore();
    });
}

/**
 * Epic header with gradient text
 */
function drawEpicHeader(ctx) {
    ctx.save();
    
    // Main title
    ctx.font = 'bold 70px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Heart icon
    ctx.shadowBlur = 30;
    ctx.shadowColor = COLORS.neonPink;
    
    const heartGrad = ctx.createLinearGradient(CONFIG.width/2 - 200, 0, CONFIG.width/2 - 100, 0);
    heartGrad.addColorStop(0, COLORS.neonPink);
    heartGrad.addColorStop(1, COLORS.neonMagenta);
    ctx.fillStyle = heartGrad;
    ctx.font = 'bold 65px Arial';
    ctx.fillText('💖', CONFIG.width/2 - 350, 140);
    
    // "LOVE CALCULATOR" text with gradient
    ctx.font = 'bold 70px "Impact", "Arial Black", sans-serif';
    
    // Outline layers for depth
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 10;
    ctx.strokeText('Aşk Hesaplama', CONFIG.width/2, 140);
    
    // Gradient fill
    const titleGrad = ctx.createLinearGradient(CONFIG.width/2 - 300, 0, CONFIG.width/2 + 300, 0);
    titleGrad.addColorStop(0, COLORS.neonPink);
    titleGrad.addColorStop(0.3, COLORS.neonMagenta);
    titleGrad.addColorStop(0.5, COLORS.neonBlue);
    titleGrad.addColorStop(0.7, COLORS.neonCyan);
    titleGrad.addColorStop(1, COLORS.neonBlue);
    ctx.fillStyle = titleGrad;
    
    ctx.shadowBlur = 40;
    ctx.shadowColor = COLORS.neonPink;
    ctx.fillText('Aşk Hesaplama', CONFIG.width/2, 140);
    
    // Subtitle with italic style
    ctx.font = 'italic bold 32px "Georgia", serif';
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.neonCyan;
    
    const subtitleGrad = ctx.createLinearGradient(CONFIG.width/2 - 200, 0, CONFIG.width/2 + 200, 0);
    subtitleGrad.addColorStop(0, COLORS.neonCyan);
    subtitleGrad.addColorStop(0.5, COLORS.white);
    subtitleGrad.addColorStop(1, COLORS.neonPurple);
    ctx.fillStyle = subtitleGrad;
    ctx.fillText('Bir kalp, bir kez sever.', CONFIG.width/2, 190);
    
    // Decorative lines
    ctx.strokeStyle = COLORS.neonPink;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    
    // Left line
    ctx.beginPath();
    ctx.moveTo(CONFIG.width/2 - 500, 210);
    ctx.lineTo(CONFIG.width/2 - 50, 210);
    ctx.stroke();
    
    // Right line  
    ctx.strokeStyle = COLORS.neonOrange;
    ctx.beginPath();
    ctx.moveTo(CONFIG.width/2 + 50, 210);
    ctx.lineTo(CONFIG.width/2 + 500, 210);
    ctx.stroke();
    
    ctx.restore();
}

/**
 * Circular avatar frame with neon effects (like reference image)
 */
function drawNeonAvatarFrame(ctx, x, y, size, username, color1, color2, side) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 2;
    
    ctx.save();
    
    // Outer glow rings
    for (let i = 3; i >= 0; i--) {
        const glowRadius = radius + 20 + (i * 15);
        const glowGrad = ctx.createRadialGradient(centerX, centerY, radius, centerX, centerY, glowRadius);
        glowGrad.addColorStop(0, color1);
        glowGrad.addColorStop(1, 'transparent');
        
        ctx.globalAlpha = 0.3 - (i * 0.05);
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Main neon circle
    ctx.strokeStyle = color1;
    ctx.lineWidth = 8;
    ctx.shadowBlur = 30;
    ctx.shadowColor = color1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner ring
    const innerGrad = ctx.createLinearGradient(x, y, x + size, y + size);
    innerGrad.addColorStop(0, color1);
    innerGrad.addColorStop(0.5, color2);
    innerGrad.addColorStop(1, color1);
    
    ctx.strokeStyle = innerGrad;
    ctx.lineWidth = 6;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
    ctx.stroke();
    
    // Cyberpunk corner brackets
    const bracketSize = 80;
    const bracketOffset = 25;
    
    ctx.strokeStyle = color2;
    ctx.lineWidth = 5;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color2;
    ctx.lineCap = 'square';
    
    // Top-left bracket
    ctx.beginPath();
    ctx.moveTo(x - bracketOffset, y - bracketOffset + bracketSize);
    ctx.lineTo(x - bracketOffset, y - bracketOffset);
    ctx.lineTo(x - bracketOffset + bracketSize, y - bracketOffset);
    ctx.stroke();
    
    // Top-right bracket
    ctx.beginPath();
    ctx.moveTo(x + size + bracketOffset - bracketSize, y - bracketOffset);
    ctx.lineTo(x + size + bracketOffset, y - bracketOffset);
    ctx.lineTo(x + size + bracketOffset, y - bracketOffset + bracketSize);
    ctx.stroke();
    
    // Bottom-left bracket
    ctx.beginPath();
    ctx.moveTo(x - bracketOffset, y + size + bracketOffset - bracketSize);
    ctx.lineTo(x - bracketOffset, y + size + bracketOffset);
    ctx.lineTo(x - bracketOffset + bracketSize, y + size + bracketOffset);
    ctx.stroke();
    
    // Bottom-right bracket
    ctx.beginPath();
    ctx.moveTo(x + size + bracketOffset, y + size + bracketOffset - bracketSize);
    ctx.lineTo(x + size + bracketOffset, y + size + bracketOffset);
    ctx.lineTo(x + size + bracketOffset - bracketSize, y + size + bracketOffset);
    ctx.stroke();
    
    // Rotating dashed circle
    ctx.setLineDash([20, 15]);
    ctx.strokeStyle = color1;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    
    // Status indicator (top right)
    const statusX = side === 'left' ? x + size + 10 : x - 10;
    const statusY = y - 10;
    
    ctx.shadowBlur = 25;
    ctx.shadowColor = color2;
    const statusGrad = ctx.createRadialGradient(statusX, statusY, 0, statusX, statusY, 30);
    statusGrad.addColorStop(0, color2);
    statusGrad.addColorStop(0.5, color1);
    statusGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = statusGrad;
    ctx.beginPath();
    ctx.arc(statusX, statusY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Username above avatar
    ctx.font = 'bold 36px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 0;
    ctx.fillText(username.substring(0, 12), centerX, y - 60);
    
    ctx.fillStyle = color1;
    ctx.shadowBlur = 25;
    ctx.shadowColor = color1;
    ctx.fillText(username.substring(0, 12), centerX, y - 60);
    
    // Decorative corner icons
    ctx.font = '35px Arial';
    ctx.shadowBlur = 15;
    
    if (side === 'left') {
        ctx.fillStyle = color1;
        ctx.fillText('💕', x - 30, y + size + 40);
        ctx.fillText('✨', x + size + 10, y + size + 40);
    } else {
        ctx.fillStyle = color2;
        ctx.fillText('🔥', x - 30, y + size + 40);
        ctx.fillText('💎', x + size + 10, y + size + 40);
    }
    
    ctx.restore();
}

/**
 * Draw avatar with circular clip
 */
function drawCircleAvatar(ctx, img, x, y, size) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 2 - 15;
    
    ctx.save();
    
    // Clip to circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Draw image - fully opaque
    ctx.globalAlpha = 1;
    ctx.drawImage(img, x, y, size, size);
    
    ctx.restore();
    
    // Shine effect
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    
    const shine = ctx.createLinearGradient(x, y, x + size/2, y + size/2);
    shine.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    shine.addColorStop(1, 'transparent');
    ctx.fillStyle = shine;
    ctx.fillRect(x, y, size/2, size/2);
    ctx.restore();
}

/**
 * Vertical liquid progress bar (exact match to reference)
 */
function drawVerticalLiquidBar(ctx, percentage, barX, barY, barWidth, barHeight) {
    const time = Date.now() / 1000;
    
    // Glass container
    ctx.save();
    
    // Outer shadow
    ctx.shadowBlur = 40;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, barX - 15, barY - 15, barWidth + 30, barHeight + 30, 30);
    ctx.fill();
    
    // Glass frame
    ctx.shadowBlur = 0;
    const frameGrad = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
    frameGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    frameGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    frameGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    ctx.fillStyle = frameGrad;
    roundRect(ctx, barX - 12, barY - 12, barWidth + 24, barHeight + 24, 28);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = COLORS.glassBorder;
    ctx.lineWidth = 2;
    roundRect(ctx, barX - 12, barY - 12, barWidth + 24, barHeight + 24, 28);
    ctx.stroke();
    
    // Inner dark background
    ctx.fillStyle = COLORS.spaceDeep;
    roundRect(ctx, barX, barY, barWidth, barHeight, 25);
    ctx.fill();
    ctx.restore();
    
    // Percentage markers on sides
    const markers = [0, 25, 50, 75, 100];
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.white;
    
    markers.forEach(mark => {
        const markY = barY + barHeight - (barHeight * mark / 100);
        const isActive = percentage >= mark;
        
        // Left marker
        ctx.save();
        ctx.fillStyle = isActive ? COLORS.neonPink : 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = isActive ? 15 : 0;
        ctx.shadowColor = COLORS.neonPink;
        ctx.beginPath();
        ctx.arc(barX - 30, markY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Right marker
        ctx.beginPath();
        ctx.arc(barX + barWidth + 30, markY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Text label (left side only)
        if (mark % 25 === 0) {
            ctx.fillStyle = isActive ? COLORS.white : 'rgba(255, 255, 255, 0.5)';
            ctx.fillText(`${mark}%`, barX - 45, markY + 6);
        }
    });
    
    // Liquid fill with wave effect
    if (percentage > 0) {
        ctx.save();
        
        // Clip to container
        ctx.beginPath();
        roundRect(ctx, barX, barY, barWidth, barHeight, 25);
        ctx.clip();
        
        const fillHeight = (percentage / 100) * barHeight;
        const fillY = barY + barHeight - fillHeight;
        
        // Gradient based on percentage
        const liquidGrad = ctx.createLinearGradient(barX, fillY, barX, barY + barHeight);
        if (percentage < 40) {
            liquidGrad.addColorStop(0, COLORS.neonCyan);
            liquidGrad.addColorStop(0.5, COLORS.neonBlue);
            liquidGrad.addColorStop(1, COLORS.neonPurple);
        } else if (percentage < 70) {
            liquidGrad.addColorStop(0, COLORS.neonPurple);
            liquidGrad.addColorStop(0.5, COLORS.neonMagenta);
            liquidGrad.addColorStop(1, COLORS.neonPink);
        } else {
            liquidGrad.addColorStop(0, COLORS.neonYellow);
            liquidGrad.addColorStop(0.5, COLORS.neonOrange);
            liquidGrad.addColorStop(1, COLORS.neonRed);
        }
        
        // Draw wave
        ctx.beginPath();
        ctx.moveTo(barX, barY + barHeight);
        
        for (let i = 0; i <= barWidth; i++) {
            const waveY = fillY + Math.sin((i / barWidth) * Math.PI * 3 + time * 2) * 10;
            ctx.lineTo(barX + i, waveY);
        }
        
        ctx.lineTo(barX + barWidth, barY + barHeight);
        ctx.lineTo(barX, barY + barHeight);
        ctx.closePath();
        
        ctx.shadowBlur = 40;
        ctx.shadowColor = COLORS.neonPink;
        ctx.fillStyle = liquidGrad;
        ctx.fill();
        
        // Top shine
        const shineGrad = ctx.createLinearGradient(barX, fillY, barX, fillY + 50);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        shineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = shineGrad;
        
        ctx.beginPath();
        ctx.moveTo(barX, fillY);
        for (let i = 0; i <= barWidth; i++) {
            const waveY = fillY + Math.sin((i / barWidth) * Math.PI * 3 + time * 2) * 10;
            ctx.lineTo(barX + i, waveY);
        }
        ctx.lineTo(barX + barWidth, fillY + 50);
        ctx.lineTo(barX, fillY + 50);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    // Percentage display - elegant and centered
    ctx.save();
    const displayY = barY + barHeight / 2;
    const displayWidth = 120;
    const displayHeight = 65;
    const displayX = barX + barWidth / 2 - displayWidth / 2;
    
    // Display background
    ctx.shadowBlur = 30;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    roundRect(ctx, displayX, displayY - displayHeight/2, displayWidth, displayHeight, 18);
    ctx.fill();
    
    // Glass overlay
    ctx.shadowBlur = 0;
    const displayGrad = ctx.createLinearGradient(displayX, displayY - displayHeight/2, displayX, displayY + displayHeight/2);
    displayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    displayGrad.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
    ctx.fillStyle = displayGrad;
    roundRect(ctx, displayX, displayY - displayHeight/2, displayWidth, displayHeight, 18);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = COLORS.neonPink;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.neonPink;
    roundRect(ctx, displayX, displayY - displayHeight/2, displayWidth, displayHeight, 18);
    ctx.stroke();
    
    // Percentage text
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.white;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.neonPink;
    ctx.fillText(`${percentage}%`, barX + barWidth / 2, displayY);
    
    ctx.restore();
}

/**
 * Particle connection between avatars
 */
function drawParticleConnection(ctx, x1, y1, x2, y2, percentage) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    
    // Particle trail
    ctx.save();
    const particleCount = 60;
    
    for (let i = 0; i <= particleCount; i++) {
        const t = i / particleCount;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * -30;
        
        const size = 3 + Math.sin(t * Math.PI) * 4;
        const alpha = Math.sin(t * Math.PI) * 0.7;
        
        // Color based on percentage
        let color;
        if (percentage < 40) {
            color = `rgba(0, 212, 255, ${alpha})`;
        } else if (percentage < 70) {
            color = `rgba(255, 0, 128, ${alpha})`;
        } else {
            color = `rgba(255, 140, 0, ${alpha})`;
        }
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

/**
 * Central heart with status badge
 */
function drawCentralHeart(ctx, percentage, centerX, centerY) {
    const time = Date.now() / 1000;
    const heartSize = 130;
    const pulse = Math.sin(time * 2) * 10;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // Outer glow
    for (let i = 4; i >= 0; i--) {
        ctx.shadowBlur = 50 + (i * 10);
        ctx.shadowColor = COLORS.neonPink;
        ctx.globalAlpha = 0.2;
        ctx.font = `${heartSize + pulse + (i * 20)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', 0, 0);
    }
    
    // Main heart with gradient
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 40;
    
    const heartGrad = ctx.createRadialGradient(0, -20, 0, 0, 0, 80);
    heartGrad.addColorStop(0, '#ffb3d9');
    heartGrad.addColorStop(0.5, COLORS.neonPink);
    heartGrad.addColorStop(1, '#c9184a');
    
    ctx.font = `${heartSize + pulse}px Arial`;
    ctx.fillStyle = heartGrad;
    ctx.fillText('❤️', 0, 0);
    
    // Sparkles
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i / 6) + time;
        const dist = 90;
        const sx = Math.cos(angle) * dist;
        const sy = Math.sin(angle) * dist;
        
        ctx.font = '28px Arial';
        ctx.globalAlpha = 0.7 + Math.sin(time * 3 + i) * 0.3;
        ctx.fillText('✨', sx, sy);
    }
    
    ctx.restore();
    
    // Status badge
    const statuses = [
        { max: 20, text: 'FROZEN', color: COLORS.neonCyan, icon: '❄️' },
        { max: 40, text: 'COLD', color: COLORS.neonBlue, icon: '💙' },
        { max: 60, text: 'WARM', color: COLORS.neonOrange, icon: '🔥' },
        { max: 80, text: 'HOT', color: COLORS.neonPink, icon: '💖' },
        { max: 100, text: 'SOULMATE', color: COLORS.gold, icon: '👑' }
    ];
    
    const status = statuses.find(s => percentage <= s.max) || statuses[4];
    
    ctx.save();
    const badgeY = centerY + 110;
    const badgeWidth = 260;
    const badgeHeight = 70;
    
    // Badge shadow
    ctx.shadowBlur = 40;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    roundRect(ctx, centerX - badgeWidth/2, badgeY - badgeHeight/2, badgeWidth, badgeHeight, 35);
    ctx.fill();
    
    // Badge background
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    roundRect(ctx, centerX - badgeWidth/2, badgeY - badgeHeight/2, badgeWidth, badgeHeight, 35);
    ctx.fill();
    
    // Badge border
    ctx.strokeStyle = status.color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 30;
    ctx.shadowColor = status.color;
    roundRect(ctx, centerX - badgeWidth/2, badgeY - badgeHeight/2, badgeWidth, badgeHeight, 35);
    ctx.stroke();
    
    // Icon
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = status.color;
    ctx.shadowBlur = 25;
    ctx.fillText(status.icon, centerX - 70, badgeY);
    
    // Text
    ctx.font = 'bold 32px "Arial Black", sans-serif';
    ctx.fillText(status.text, centerX + 30, badgeY);
    
    ctx.restore();
}

/**
 * Footer
 */
function drawFooter(ctx) {
    ctx.save();
    
    ctx.font = 'italic bold 28px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.neonPurple;
    
    const footerGrad = ctx.createLinearGradient(CONFIG.width/2 - 300, 0, CONFIG.width/2 + 300, 0);
    footerGrad.addColorStop(0, COLORS.neonPurple);
    footerGrad.addColorStop(0.5, COLORS.neonPink);
    footerGrad.addColorStop(1, COLORS.neonCyan);
    ctx.fillStyle = footerGrad;
    
    ctx.fillText('İmkansız diye bir şey yoktur. Senin olan sana koşar!', CONFIG.width/2, CONFIG.height - 60);
    
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════════

function renderShipImage(avatar1Img, avatar2Img, user1Name, user2Name, percentage) {
    const canvas = Canvas.createCanvas(CONFIG.width, CONFIG.height);
    const ctx = canvas.getContext('2d');
    
    // Layout
    const avatarSize = 280;
    const avatarY = 300;
    const avatar1X = 240;
    const avatar2X = CONFIG.width - 240 - avatarSize;
    
    const barWidth = 100;
    const barHeight = 400;
    const barX = (CONFIG.width - barWidth) / 2;
    const barY = 220;
    
    // Draw all layers
    drawSpaceBackground(ctx);
    drawEpicHeader(ctx);
    
    // Avatar colors
    const color1A = COLORS.neonPink;
    const color1B = COLORS.neonMagenta;
    const color2A = COLORS.neonOrange;
    const color2B = COLORS.neonYellow;
    
    // Connection BEHIND the bar (draw first)
    const connectionY = avatarY + avatarSize / 2;
    drawParticleConnection(ctx, avatar1X + avatarSize, connectionY, avatar2X, connectionY, percentage);
    
    // Progress bar (draw on top of connection)
    drawVerticalLiquidBar(ctx, percentage, barX, barY, barWidth, barHeight);
    
    // Avatar frames
    drawNeonAvatarFrame(ctx, avatar1X, avatarY, avatarSize, user1Name, color1A, color1B, 'left');
    drawNeonAvatarFrame(ctx, avatar2X, avatarY, avatarSize, user2Name, color2A, color2B, 'right');
    
    // Avatars
    drawCircleAvatar(ctx, avatar1Img, avatar1X, avatarY, avatarSize);
    drawCircleAvatar(ctx, avatar2Img, avatar2X, avatarY, avatarSize);
    
    drawFooter(ctx);
    
    return canvas;
}

// ═══════════════════════════════════════════════════════════════
// 🚀 DISCORD COMMAND
// ═══════════════════════════════════════════════════════════════

module.exports.run = async (client, message, args) => {
    const user1 = message.author;
    const user2Member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const user2 = user2Member?.user;

    // Validations
    if (!user2Member && args[0]) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.neonRed)
                .setTitle('❌ Kullanıcı Bulunamadı')
                .setDescription('Belirtilen kullanıcı bulunamadı!')
            ]
        });
    }

    if (user2?.id === user1.id) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.neonOrange)
                .setTitle('🤔 Kendinle mi?')
                .setDescription('Başka birini etiketlemelisin!')
            ]
        });
    }

    if (!user2) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.neonPurple)
                .setTitle('📖 Kullanım')
                .setDescription([
                    '**Kullanım:**',
                    '`g!ship @kullanıcı`',
                    '',
                    '**Örnek:**',
                    '`g!ship @Arkadaşın`'
                ].join('\n'))
            ]
        });
    }

    if (user1.bot || user2.bot) {
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#666666')
                .setTitle('🤖 Bot Olmaz!')
                .setDescription('Sadece insanları shiplerim!')
            ]
        });
    }

    // Calculate compatibility
    const sortedIds = [user1.id, user2.id].sort().join('');
    let seed = 0;
    for (let i = 0; i < sortedIds.length; i++) {
        seed += sortedIds.charCodeAt(i);
    }
    const compatibility = (seed * 97) % 101;

    // Load avatars
    const avatar1 = await Canvas.loadImage(user1.displayAvatarURL({ extension: 'png', size: 512 }));
    const avatar2 = await Canvas.loadImage(user2.displayAvatarURL({ extension: 'png', size: 512 }));

    // Render
    function render(score) {
        const canvas = renderShipImage(avatar1, avatar2, user1.username, user2.username, score);
        return {
            files: [{
                attachment: canvas.toBuffer('image/png'),
                name: 'love-calculator.png'
            }]
        };
    }

    // Create embed
    function createEmbed(score) {
        const hearts = '💖'.repeat(Math.ceil(score / 20)) + '🖤'.repeat(5 - Math.ceil(score / 20));

        const levels = [
            { max: 20, title: '❄️ FROZEN', desc: 'Buzlu bir ilişki... Soğuk! 💙', color: COLORS.neonCyan },
            { max: 40, title: '🌊 COLD', desc: 'Mesafeli bir bağ... Zaman lazım. 🌊', color: COLORS.neonBlue },
            { max: 60, title: '🔥 WARM', desc: 'Isınmaya başladı! Potansiyel var! 🌟', color: COLORS.neonOrange },
            { max: 80, title: '💖 HOT', desc: 'Güçlü çekim! Muhteşem uyum! 💕', color: COLORS.neonPink },
            { max: 100, title: '👑 SOULMATE', desc: 'Kusursuz! Ruh eşi bulundu! 💎✨', color: COLORS.gold }
        ];

        const level = levels.find(l => score <= l.max) || levels[4];

        return new EmbedBuilder()
            .setColor(level.color)
            .setTitle(`${level.title}`)
            .setDescription([
                `**${user1.username}** 💫 **${user2.username}**`,
                '',
                hearts,
                `**Uyum: ${score}%**`,
                '',
                `_${level.desc}_`
            ].join('\n'))
            .setImage('attachment://love-calculator.png')
            .setFooter({
                text: `${user1.username} tarafından istendi • Aşk Hesaplama`,
                iconURL: user1.displayAvatarURL()
            })
            .setTimestamp();
    }

    const attachment = render(compatibility);
    const embed = createEmbed(compatibility);

    // Buttons
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ship_delete')
            .setEmoji('🗑️')
            .setLabel('Sil')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('ship_reroll')
            .setEmoji('🎲')
            .setLabel('Yeniden')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ship_info')
            .setEmoji('ℹ️')
            .setLabel('Detay')
            .setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({
        embeds: [embed],
        components: [row],
        ...attachment
    });

    // Collector
    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === user1.id,
        time: 180000
    });

    collector.on('collect', async i => {
        if (i.customId === 'ship_delete') {
            await msg.delete().catch(() => {});
            collector.stop();
            return;
        }

        if (i.customId === 'ship_reroll') {
            const newScore = Math.floor(Math.random() * 101);
            await i.update({
                embeds: [createEmbed(newScore)],
                components: [row],
                ...render(newScore)
            });
            return;
        }

        if (i.customId === 'ship_info') {
            const detailEmbed = new EmbedBuilder()
                .setColor(COLORS.neonPurple)
                .setTitle('📊 Detaylı Analiz')
                .setDescription([
                    `**${user1.username}** ❌ **${user2.username}**`,
                    '',
                    '**Kategoriler:**',
                    '',
                    `💬 İletişim: ${Math.floor(Math.random() * 40) + 60}%`,
                    `❤️ Duygusal: ${Math.floor(Math.random() * 40) + 60}%`,
                    `🎯 İlgi: ${Math.floor(Math.random() * 40) + 60}%`,
                    `⚡ Enerji: ${Math.floor(Math.random() * 40) + 60}%`,
                    `🌟 Gelecek: ${Math.floor(Math.random() * 40) + 60}%`,
                    '',
                    `**Genel: ${compatibility}%**`
                ].join('\n'))
                .setFooter({ text: 'Grave Aşk Hesaplayıcı' })
                .setTimestamp();

            await i.reply({ embeds: [detailEmbed], ephemeral: true });
        }
    });

    collector.on('end', async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
            row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
        await msg.edit({ components: [disabledRow] }).catch(() => {});
    });
};

module.exports.conf = {
    aliases: ['aşk', 'uyum', 'love', 'calculator'],
    cooldown: 5
};

module.exports.help = {
    name: 'ship',
    description: 'Epic cyberpunk neon aşk uyum hesaplayıcı - Referans tasarımına sadık',
    usage: 'ship @kullanıcı',
    category: 'Eğlence'
};
