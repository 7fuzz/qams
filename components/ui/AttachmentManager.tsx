"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input } from '.';
import { Link as LinkIcon, Trash2, Plus, ExternalLink } from 'lucide-react';

interface Attachment {
  attachment_id: string;
  url: string;
  name: string;
}

interface AttachmentManagerProps {
  entityId: string;
  entityType: 'TEST_CASE' | 'ISSUE' | 'PROJECT';
}

export const AttachmentManager = ({ entityId, entityType }: AttachmentManagerProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAttachments = useCallback(async () => {
    const res = await fetch(`/api/attachments?entityId=${entityId}&entityType=${entityType}`);
    const data = await res.json();
    setAttachments(data);
  }, [entityId, entityType]);

  useEffect(() => {
    if (entityId) {
      queueMicrotask(() => {
        fetchAttachments();
      });
    }
  }, [entityId, fetchAttachments]);

  const handleAdd = async () => {
    if (!newUrl) return;
    setLoading(true);
    await fetch('/api/attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_id: entityId,
        entity_type: entityType,
        url: newUrl,
        name: newName || newUrl
      }),
    });
    setNewUrl('');
    setNewName('');
    fetchAttachments();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/attachments?id=${id}`, { method: 'DELETE' });
    fetchAttachments();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-text-theme-muted">
        <LinkIcon size={16} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Attachments ({attachments.length})</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {attachments.map(att => (
          <div key={att.attachment_id} className="flex items-center justify-between p-2 rounded bg-surface-muted border border-border-theme text-xs">
            <a
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary-theme hover:underline truncate flex-1 mr-4 font-medium"
            >
              <ExternalLink size={12} />
              {att.name}
            </a>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-danger-theme" onClick={() => handleDelete(att.attachment_id)}>
              <Trash2 size={12} />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 p-3 rounded-lg border border-dashed border-border-theme bg-surface-muted/50">
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Link Name (e.g. Screenshot)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="h-8 text-[10px]"
          />
          <Input
            placeholder="URL (http://...)"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="h-8 text-[10px]"
          />
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold" onClick={handleAdd} disabled={loading || !newUrl}>
          <Plus size={12} className="mr-1" /> Add Link
        </Button>
      </div>
    </div>
  );
};
