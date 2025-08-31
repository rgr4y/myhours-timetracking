import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Building, Trash2 } from 'lucide-react';
import {
  Container,
  Card,
  FlexBox,
  Title,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Select
} from './ui';

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_website: '',
    timer_rounding: '15',
    invoice_template: 'default',
    invoice_terms: 'Net 30'
  });

  const [originalSettings, setOriginalSettings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const isDev = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    const loadData = async () => {
      if (window.electronAPI) {
        try {
          const currentSettings = await window.electronAPI.settings.get();
          const mergedSettings = { ...settings, ...currentSettings };
          setSettings(mergedSettings);
          setOriginalSettings(mergedSettings);
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
    };
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if settings have changed
  const hasUnsavedChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const handleSave = async () => {
    if (window.electronAPI) {
      try {
        setIsLoading(true);
        await window.electronAPI.settings.update(settings);
        
        // Show saved animation
        setIsSaved(true);
        setOriginalSettings({ ...settings }); // Update original to current
        
        // Reset saved state after 2 seconds
        setTimeout(() => {
          setIsSaved(false);
        }, 2000);
        
      } catch (error) {
        console.error('Error saving settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Container padding="40px" style={{ height: '100vh', overflowY: 'auto' }}>
      <FlexBox justify="space-between" align="center" margin="0 0 30px 0">
        <Title>Settings</Title>
        <Button 
          variant="primary" 
          onClick={handleSave} 
          disabled={isLoading || !hasUnsavedChanges() || isSaved}
        >
          <Save size={16} />
          {isLoading ? 'Saving...' : isSaved ? 'Saved!' : 'Save Settings'}
        </Button>
      </FlexBox>

      <FlexBox direction="column" gap="30px">
        {/* Company Information */}
        <Card>
          <Heading margin="0 0 20px 0">
            <Building size={20} style={{ marginRight: '10px' }} />
            Company Information
          </Heading>
          
          <FlexBox direction="column" gap="20px">
            <FlexBox direction="column" gap="5px">
              <Label>Company Name</Label>
              <Input
                value={settings.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Your Company Name"
              />
            </FlexBox>
            
            <FlexBox direction="column" gap="5px">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={settings.company_email}
                onChange={(e) => handleInputChange('company_email', e.target.value)}
                placeholder="contact@yourcompany.com"
              />
            </FlexBox>
            
            <FlexBox direction="column" gap="5px">
              <Label>Phone Number</Label>
              <Input
                value={settings.company_phone}
                onChange={(e) => handleInputChange('company_phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </FlexBox>
            
            <FlexBox direction="column" gap="5px">
              <Label>Website</Label>
              <Input
                value={settings.company_website}
                onChange={(e) => handleInputChange('company_website', e.target.value)}
                placeholder="www.yourcompany.com"
              />
            </FlexBox>
          </FlexBox>
        </Card>

        {/* Timer Settings */}
        <Card>
          <Heading margin="0 0 20px 0">Timer Settings</Heading>
          
          <FlexBox direction="column" gap="15px">
            <FlexBox direction="column" gap="5px">
              <Label>Time Rounding (minutes)</Label>
              <Select
                value={settings.timer_rounding}
                onChange={(e) => handleInputChange('timer_rounding', e.target.value)}
              >
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
              </Select>
              <Text variant="secondary" size="small">
                Round time entries to the nearest interval
              </Text>
            </FlexBox>
          </FlexBox>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <Heading margin="0 0 20px 0">Invoice Settings</Heading>
          
          <FlexBox direction="column" gap="15px">
            <FlexBox direction="column" gap="5px">
              <Label>Invoice Template</Label>
              <Select
                value={settings.invoice_template}
                onChange={(e) => handleInputChange('invoice_template', e.target.value)}
              >
                <option value="default">Default Template</option>
              </Select>
              <Text variant="secondary" size="small">Additional templates coming soon.</Text>
            </FlexBox>

            <FlexBox direction="column" gap="5px">
              <Label>Payment Terms</Label>
              <Select
                value={settings.invoice_terms}
                onChange={(e) => handleInputChange('invoice_terms', e.target.value)}
              >
                <option>Due on receipt</option>
                <option>Net 7</option>
                <option>Net 14</option>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 45</option>
                <option>Net 60</option>
              </Select>
              <Text variant="secondary" size="small">Controls the invoice due date shown on PDFs.</Text>
            </FlexBox>
          </FlexBox>
        </Card>

        {/* Danger Zone */}
        <Card>
          <Heading margin="0 0 12px 0">Danger Zone</Heading>
          <Text variant="secondary" size="small" style={{ marginBottom: '12px' }}>
            Removes all data (clients, projects, tasks, time entries, invoices). Your settings are preserved.
          </Text>
          <FlexBox justify="flex-start">
            <Button
              variant="danger"
              onClick={async () => {
                if (isRemoving) return;
                const ok = window.confirm('Reset all data? This will delete all sample clients, projects, tasks, time entries, and invoices. Settings will be kept. This cannot be undone.');
                if (!ok) return;
                try {
                  setIsRemoving(true);
                  await window.electronAPI.invoke('db:removeDemoData');
                  alert('All data removed.');
                  navigate('/');
                } catch (e) {
                  console.error('Failed to remove all data:', e);
                  alert('Failed to remove all data. See console for details.');
                } finally {
                  setIsRemoving(false);
                }
              }}
              disabled={isRemoving}
            >
              <Trash2 size={16} />
              {isRemoving ? 'Removing…' : 'Clear All Data'}
            </Button>
            {isDev && (
              <Button
                variant="secondary"
                style={{ marginLeft: '10px' }}
                onClick={async () => {
                  const ok = window.confirm('Re-run seed? This will clear and repopulate the dev database.');
                  if (!ok) return;
                  try {
                    const res = await window.electronAPI.invoke('dev:runSeed');
                    if (res?.success) {
                      alert('Seed completed.');
                    } else {
                      alert('Seed failed: ' + (res?.error || 'Unknown error'));
                    }
                  } catch (e) {
                    console.error('Seed error:', e);
                    alert('Seed failed. See console for details.');
                  }
                }}
              >
                Re-run Seed (Dev)
              </Button>
            )}
          </FlexBox>
        </Card>
      </FlexBox>
    </Container>
  );
};

export default Settings;
