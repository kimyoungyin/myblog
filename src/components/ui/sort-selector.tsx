import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Clock, Eye, Heart, TrendingUp } from 'lucide-react';
import type { PostSort } from '@/types';

export type SortOption = PostSort;

interface SortSelectorProps {
    currentSort: SortOption;
    currentTagId?: string;
    className?: string;
}

const SORT_OPTIONS = [
    {
        value: 'latest' as const,
        label: '최신순',
        icon: Clock,
        description: '최근 작성된 글부터',
    },
    {
        value: 'popular' as const,
        label: '인기순',
        icon: Eye,
        description: '조회수가 높은 글부터',
    },
    {
        value: 'likes' as const,
        label: '좋아요순',
        icon: Heart,
        description: '좋아요가 많은 글부터',
    },
    {
        value: 'oldest' as const,
        label: '오래된순',
        icon: TrendingUp,
        description: '과거 작성된 글부터',
    },
];

export const SortSelector: React.FC<SortSelectorProps> = ({
    currentSort,
    currentTagId,
    className = '',
}) => {
    const currentOption = SORT_OPTIONS.find(
        (option) => option.value === currentSort
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={`flex items-center gap-2 ${className}`}
                >
                    {currentOption && (
                        <>
                            <currentOption.icon className="h-4 w-4" />
                            {currentOption.label}
                        </>
                    )}
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {SORT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const params = new URLSearchParams();
                    params.set('sort', option.value);
                    if (currentTagId) params.set('tag', currentTagId);
                    const href = `?${params.toString()}`;
                    return (
                        <DropdownMenuItem key={option.value} asChild>
                            <Link
                                href={href}
                                className={`flex items-center gap-2 ${
                                    currentSort === option.value
                                        ? 'bg-accent text-accent-foreground'
                                        : ''
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                <div className="flex flex-col">
                                    <span className="font-medium">
                                        {option.label}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        {option.description}
                                    </span>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
