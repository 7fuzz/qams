"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Button, Label, Input, Combobox, Textarea, AttachmentManager } from '../ui';
import { TEST_CASE_TYPE_OPTIONS, TEST_PRIORITY_OPTIONS, AUTOMATION_STATUS_OPTIONS } from '@/lib/constants';

interface Scenario {
    scenario_id: string;
    name: string;
}

interface TestCase {
  test_case_id: string;
  scenario_id: string;
  title: string;
  type: string;
  priority: string;
  automation_status: string;
  requirement_link: string;
  estimated_duration: number;
  precondition: string;
  steps: string;
  test_data: string;
  expected_result: string;
}

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
                <Label>Scenario</Label>
                <Combobox 
                    options={scenarios.map(s => ({ value: s.scenario_id, label: s.name }))}
                    value={formData.scenario_id}
                    onChange={val => setFormData({...formData, scenario_id: val as string})}
                />
            </div>
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
                <Label>Priority</Label>
                <Combobox 
                    options={TEST_PRIORITY_OPTIONS} 
                    value={formData.priority} 
                    onChange={val => setFormData({...formData, priority: val as string})} 
                />
            </div>
            <div className="space-y-2">
                <Label>Automation</Label>
                <Combobox 
                    options={AUTOMATION_STATUS_OPTIONS} 
                    value={formData.automation_status} 
                    onChange={val => setFormData({...formData, automation_status: val as string})} 
                />
            </div>
            <div className="space-y-2">
                <Label>Duration (Min)</Label>
                <Input type="number" value={formData.estimated_duration || 0} onChange={e => setFormData({...formData, estimated_duration: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2 col-span-2">
                <Label>Requirement Link (Jira/Doc)</Label>
                <Input placeholder="https://..." value={formData.requirement_link || ''} onChange={e => setFormData({...formData, requirement_link: e.target.value})} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
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
            </div>

            <div className="space-y-6 border-l dark:border-gray-800 pl-6">
                <div className="space-y-2">
                    <Label>Test Data (JSON/Complex)</Label>
                    <Textarea 
                        placeholder='{"key": "value"} or csv data...'
                        value={formData.test_data || ''} 
                        onChange={e => setFormData({...formData, test_data: e.target.value})} 
                        className="min-h-[200px] font-mono text-[11px]"
                    />
                </div>

                <AttachmentManager entityId={testCase.test_case_id} entityType="TEST_CASE" />
            </div>
        </div>

        <div className="flex justify-end gap-3 border-t dark:border-gray-800 pt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
