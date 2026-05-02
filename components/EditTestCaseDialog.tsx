"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Button, Label, Input, Combobox, Textarea } from './ui';
import { TEST_CASE_TYPE_OPTIONS } from '@/lib/constants';

interface TestCase {
  test_case_id: number;
  scenario_id: number;
  title: string;
  type: string;
  precondition: string;
  steps: string;
  test_data: string;
  expected_result: string;
}

interface EditTestCaseDialogProps {
  testCase: TestCase | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const EditTestCaseDialog = ({ testCase, isOpen, onClose, onSave }: EditTestCaseDialogProps) => {
  const [formData, setFormData] = useState<Partial<TestCase>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (testCase) setFormData(testCase);
  }, [testCase, isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch('/api/test-cases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      onSave();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!testCase) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit: ${testCase.title}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
                <Label>Case Title</Label>
                <Input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div className="space-y-2">
                <Label>Type</Label>
                <Combobox 
                    options={TEST_CASE_TYPE_OPTIONS} 
                    value={formData.type} 
                    onChange={val => setFormData({...formData, type: val as string})} 
                />
            </div>
            <div className="space-y-2">
                <Label>Test Data</Label>
                <Input value={formData.test_data || ''} onChange={e => setFormData({...formData, test_data: e.target.value})} />
            </div>
        </div>

        <div className="space-y-2">
            <Label>Precondition</Label>
            <Textarea value={formData.precondition || ''} onChange={e => setFormData({...formData, precondition: e.target.value})} />
        </div>

        <div className="space-y-2">
            <Label>Test Steps</Label>
            <Textarea 
                value={formData.steps || ''} 
                onChange={e => setFormData({...formData, steps: e.target.value})} 
                className="min-h-[150px]"
            />
        </div>

        <div className="space-y-2">
            <Label>Expected Result</Label>
            <Textarea value={formData.expected_result || ''} onChange={e => setFormData({...formData, expected_result: e.target.value})} />
        </div>

        <div className="flex justify-end gap-3 border-t dark:border-gray-800 pt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
