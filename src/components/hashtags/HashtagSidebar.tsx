import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hash } from 'lucide-react';
import type { HashtagWithCount } from '@/types';

interface HashtagSidebarProps {
    hashtags: HashtagWithCount[];
    className?: string;
    title?: string;
    showCount?: boolean;
}

export const HashtagSidebar: React.FC<HashtagSidebarProps> = ({
    hashtags,
    className = '',
    showCount = true,
}) => {
    if (hashtags.length === 0) {
        return null;
    }

    return (
        <Card className={`h-fit ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Hash className="h-4 w-4" />
                    {'해시태그별'}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    {hashtags.map((hashtag) => (
                        <Link
                            key={hashtag.id}
                            href={`/posts?tag=${hashtag.id}`}
                            className="group hover:bg-accent flex items-center justify-between rounded-lg p-2 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="secondary"
                                    className="group-hover:bg-accent-foreground/10 text-xs"
                                >
                                    #{hashtag.name}
                                </Badge>
                            </div>
                            {showCount && (
                                <span className="text-muted-foreground text-xs">
                                    {hashtag.post_count}개
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
