"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Button, Label, Input, Combobox, Textarea, AttachmentManager } from '../ui';
import { TEST_CASE_TYPE_OPTIONS, TEST_PRIORITY_OPTIONS, AUTOMATION_STATUS_OPTIONS } from '@/lib/constants';
import { TestCase, Scenario } from '@/types/app';

interface EditTestCaseDialogProps {
  testCase: TestCase | null;
  scenarios: Scenario[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const EditTestCaseDialog = ({ testCase, scenarios, isOpen, onClose, onSave }: EditTestCaseDialogProps) => {
  const [formData, setFormData] = useState<Partial<TestCase>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
        if (isOpen && testCase) {
            setFormData(testCase);
        }
    });
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
      <div className="space-y-6 text-black dark:text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
                <Label className="text-black dark:text-white">Scenario</Label>
                <Combobox 
                    options={scenarios.map(s => ({ value: s.scenario_id, label: s.name }))}
                    value={formData.scenario_id}
                    onChange={val => setFormData(prev => ({...prev, scenario_id: val as string}))}
                />
            </div>
            <div className="space-y-2 col-span-2">
                <Label className="text-black dark:text-white">Case Title</Label>
                <Input value={formData.title || ''} onChange={e => setFormData(prev => ({...prev, title: e.target.value}))} className="bg-white dark:bg-gray-950 text-black dark:text-white" />
            </div>
            <div className="space-y-2">
                <Label className="text-black dark:text-white">Type</Label>
                <Combobox 
                    options={TEST_CASE_TYPE_OPTIONS} 
                    value={formData.type} 
                    onChange={val => setFormData(prev => ({...prev, type: val as string}))} 
                />
            </div>
            <div className="space-y-2">
                <Label className="text-black dark:text-white">Priority</Label>
                <Combobox 
                    options={TEST_PRIORITY_OPTIONS} 
                    value={formData.priority} 
                    onChange={val => setFormData(prev => ({...prev, priority: val as string}))} 
                />
            </div>
            <div className="space-y-2">
                <Label className="text-black dark:text-white">Automation</Label>
                <Combobox 
                    options={AUTOMATION_STATUS_OPTIONS} 
                    value={formData.automation_status} 
                    onChange={val => setFormData(prev => ({...prev, automation_status: val as string}))} 
                />
            </div>
            <div className="space-y-2">
                <Label className="text-black dark:text-white">Duration (Min)</Label>
                <Input type="number" value={formData.estimated_duration || 0} onChange={e => setFormData(prev => ({...prev, estimated_duration: parseInt(e.target.value)}))} className="bg-white dark:bg-gray-950 text-black dark:text-white" />
            </div>
            <div className="space-y-2 col-span-2">
                <Label className="text-black dark:text-white">Requirement Link (Jira/Doc)</Label>
                <Input placeholder="https://..." value={formData.requirement_link || ''} onChange={e => setFormData(prev => ({...prev, requirement_link: e.target.value}))} className="bg-white dark:bg-gray-950 text-black dark:text-white" />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-black dark:text-white">Precondition</Label>
                    <Textarea value={formData.precondition || ''} onChange={e => setFormData(prev => ({...prev, precondition: e.target.value}))} className="bg-white dark:bg-gray-950 text-black dark:text-white" />
                </div>

                <div className="space-y-2">
                    <Label className="text-black dark:text-white">Test Steps</Label>
                    <Textarea 
                        value={formData.steps || ''} 
                        onChange={e => setFormData(prev => ({...prev, steps: e.target.value}))} 
                        className="min-h-[150px] bg-white dark:bg-gray-950 text-black dark:text-white"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-black dark:text-white">Expected Result</Label>
                    <Textarea value={formData.expected_result || ''} onChange={e => setFormData(prev => ({...prev, expected_result: e.target.value}))} className="bg-white dark:bg-gray-950 text-black dark:text-white" />
                </div>
            </div>

            <div className="space-y-6 border-l dark:border-gray-800 pl-6">
                <div className="space-y-2">
                    <Label className="text-black dark:text-white">Test Data (JSON/Complex)</Label>
                    <Textarea 
                        placeholder='{"key": "value"} or csv data...'
                        value={formData.test_data || ''} 
                        onChange={e => setFormData(prev => ({...prev, test_data: e.target.value}))} 
                        className="min-h-[200px] font-mono text-[11px] bg-white dark:bg-gray-950 text-black dark:text-white"
                    />
                </div>

                <AttachmentManager entityId={testCase.test_case_id} entityType="TEST_CASE" />
            </div>
        </div>

        <div className="flex justify-end gap-3 border-t dark:border-gray-800 pt-6">
          <Button variant="outline" onClick={onClose} className="text-black dark:text-white border-black dark:border-white">Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 border-0 shadow-lg shadow-blue-500/20 px-8 font-bold">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
