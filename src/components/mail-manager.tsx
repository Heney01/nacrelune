
'use client';

import React, { useState, useMemo } from 'react';
import type { MailLog } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Mail, Search, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';

interface MailManagerProps {
    initialMailLogs: MailLog[];
}

const statusVariants: { [key: string]: string } = {
    'SUCCESS': 'bg-green-100 text-green-800 border-green-200',
    'ERROR': 'bg-red-100 text-red-800 border-red-200',
    'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'PROCESSING': 'bg-blue-100 text-blue-800 border-blue-200',
};

const statusIcons: { [key: string]: React.ElementType } = {
    'SUCCESS': CheckCircle,
    'ERROR': AlertTriangle,
    'PENDING': Clock,
    'PROCESSING': Clock,
};

export function MailManager({ initialMailLogs }: MailManagerProps) {
    const t = useTranslations('Admin'); // Assuming some translations might be needed
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | string>('all');

    const filteredLogs = useMemo(() => {
        return initialMailLogs
            .filter(log => {
                if (statusFilter !== 'all' && log.delivery?.state !== statusFilter) {
                    return false;
                }
                const recipient = Array.isArray(log.to) ? log.to.join(', ') : String(log.to);
                if (searchTerm && !recipient.toLowerCase().includes(searchTerm.toLowerCase()) && !log.subject.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false;
                }
                return true;
            });
    }, [initialMailLogs, searchTerm, statusFilter]);
    
    const ALL_STATUSES = Array.from(new Set(initialMailLogs.map(log => log.delivery?.state || 'PENDING')));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-headline flex items-center gap-2">
                    <Mail /> Gestion des E-mails
                </CardTitle>
                <CardDescription>
                    Consultez l'historique de tous les e-mails transactionnels envoyés par le système.
                </CardDescription>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 pt-4">
                    <div className="relative w-full md:w-auto md:flex-grow md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par e-mail ou sujet..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filtrer par statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            {ALL_STATUSES.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Statut</TableHead>
                            <TableHead>Destinataire</TableHead>
                            <TableHead>Sujet</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Détails</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map(log => {
                                const state = log.delivery?.state || 'PENDING';
                                const Icon = statusIcons[state] || Clock;
                                const recipient = Array.isArray(log.to) ? log.to.join(', ') : log.to;
                                return (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(statusVariants[state])}>
                                            <Icon className="h-3 w-3 mr-1.5" />
                                            {state}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{recipient}</TableCell>
                                    <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                                    <TableCell>{log.delivery?.startTime ? new Date(log.delivery.startTime).toLocaleString() : 'En attente'}</TableCell>
                                    <TableCell className="text-right">
                                         {log.delivery?.error && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                             <AlertTriangle className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-sm">
                                                        <p className="font-bold text-destructive">Erreur de livraison</p>
                                                        <p className="text-xs bg-destructive/10 p-2 rounded-md mt-2">{log.delivery.error}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                         )}
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    Aucun e-mail trouvé.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
