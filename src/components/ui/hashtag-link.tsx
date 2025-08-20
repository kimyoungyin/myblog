import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Hashtag } from '@/types';

interface HashtagLinkProps {
    hashtag: Hashtag;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
    showHash?: boolean;
}

export const HashtagLink: React.FC<HashtagLinkProps> = ({
    hashtag,
    variant = 'secondary',
    className = '',
    showHash = true,
}) => {
    return (
        <Link
            href={`/posts?tag=${encodeURIComponent(hashtag.name)}`}
            className={`transition-colors hover:opacity-80 ${className}`}
        >
            <Badge variant={variant} className="text-xs">
                {showHash ? '#' : ''}
                {hashtag.name}
            </Badge>
        </Link>
    );
};
