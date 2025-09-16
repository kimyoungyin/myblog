import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Eye, Heart, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import { Post } from '@/types';
import { HashtagLink } from '@/components/ui/hashtag-link';

interface PostCardProps {
    post: Post;
    className?: string;
    priority?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
    post,
    className = '',
    priority = false,
}) => {
    return (
        <Card
            className={`transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${className}`}
        >
            <CardHeader className="pb-3">
                <Link
                    href={`/posts/${post.id}`}
                    className="group block cursor-pointer"
                >
                    {/* 썸네일 - 항상 표시 */}
                    <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg">
                        {post.thumbnail_url ? (
                            <Image
                                src={post.thumbnail_url}
                                alt={post.title}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                width={500}
                                height={500}
                                priority={priority}
                            />
                        ) : (
                            <div className="h-full w-full bg-gray-300 dark:bg-gray-700" />
                        )}
                    </div>

                    <CardTitle className="group-hover:text-primary line-clamp-2 text-lg transition-colors">
                        {post.title}
                    </CardTitle>
                </Link>
            </CardHeader>

            <CardContent className="pt-0">
                {/* 메타 정보 */}
                <div className="text-muted-foreground mb-3 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(post.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{post.view_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        <span>{post.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{post.comments_count}</span>
                    </div>
                </div>

                {/* 해시태그 */}
                {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {post.hashtags
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((hashtag) => (
                                <HashtagLink
                                    key={hashtag.id}
                                    hashtag={hashtag}
                                />
                            ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
