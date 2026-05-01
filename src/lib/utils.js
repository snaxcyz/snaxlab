import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function formatDate(date) {
    return Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
}
export function calculateWordCountFromHtml(html) {
    if (!html)
        return 0;
    const textOnly = html.replace(/<[^>]+>/g, '');
    return textOnly.split(/\s+/).filter(Boolean).length;
}
export function readingTime(wordCount) {
    const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));
    return `${readingTimeMinutes} min read`;
}
export function getHeadingMargin(depth) {
    const margins = {
        3: 'ml-4',
        4: 'ml-8',
        5: 'ml-12',
        6: 'ml-16',
    };
    return margins[depth] || '';
}
