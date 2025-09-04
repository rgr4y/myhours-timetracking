import React, { useState, useEffect, useCallback } from 'react';
import { Clock, DollarSign } from 'lucide-react';
import { colors } from '../styles/theme';
import AnimatedNumber from './AnimatedNumber';
import {
  Container,
  Grid,
  Card,
  FlexBox,
  Title,
  Heading,
  Text,
  BigNumber,
  IconContainer
} from './ui';

const Reports = () => {
  const [stats, setStats] = useState({
    totalHours: 0,
    totalHoursLast30Days: 0,
    totalEarningsThisMonth: 0,
    totalEarningsLast30Days: 0,
    totalInvoiced: 0,
    totalHoursInvoiced: 0,
    unInvoicedEarnings: 0,
    invoicedEarningsThisMonth: 0,
    invoicedEarningsLast30Days: 0,
    currentMonthName: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  
  const getCurrentMonthName = () => {
    const now = new Date();
    return now.toLocaleString('default', { month: 'long' });
  };

  const loadData = useCallback(async () => {
    if (window.electronAPI) {
      try {
        const timeEntries = await window.electronAPI.timeEntries.getAll();
        const invoices = await window.electronAPI.invoices.getAll();
        
        // Calculate date ranges
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Filter entries for this month
        const thisMonthEntries = timeEntries.filter(entry => {
          const entryDate = new Date(entry.startTime);
          return entryDate >= startOfMonth;
        });
        
        // Filter entries for last 30 days
        const last30DaysEntries = timeEntries.filter(entry => {
          const entryDate = new Date(entry.startTime);
          return entryDate >= thirtyDaysAgo;
        });
        
        // Calculate this month stats
        const totalHoursThisMonth = thisMonthEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
        const totalEarningsThisMonth = thisMonthEntries.reduce((sum, entry) => {
          const rate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
          return sum + (rate * (entry.duration || 0) / 60);
        }, 0);
        
        // Calculate last 30 days stats
        const totalHoursLast30Days = last30DaysEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
        const totalEarningsLast30Days = last30DaysEntries.reduce((sum, entry) => {
          const rate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
          return sum + (rate * (entry.duration || 0) / 60);
        }, 0);
        
        // Calculate invoice stats for all time
        const totalInvoiced = invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
        
        // Calculate invoiced hours from time entries marked as invoiced (all time)
        const allInvoicedEntries = timeEntries.filter(entry => entry.isInvoiced);
        const totalHoursInvoiced = allInvoicedEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
        
        // Calculate un-invoiced earnings (all time)
        const unInvoicedEntries = timeEntries.filter(entry => !entry.isInvoiced);
        const unInvoicedEarnings = unInvoicedEntries.reduce((sum, entry) => {
          const rate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
          return sum + (rate * (entry.duration || 0) / 60);
        }, 0);
        
        // Calculate invoiced earnings for this month
        const thisMonthInvoicedEntries = timeEntries.filter(entry => {
          if (!entry.isInvoiced) return false;
          const entryDate = new Date(entry.startTime);
          return entryDate >= startOfMonth;
        });
        const invoicedEarningsThisMonth = thisMonthInvoicedEntries.reduce((sum, entry) => {
          const rate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
          return sum + (rate * (entry.duration || 0) / 60);
        }, 0);
        
        // Calculate invoiced earnings for last 30 days
        const last30DaysInvoicedEntries = timeEntries.filter(entry => {
          if (!entry.isInvoiced) return false;
          const entryDate = new Date(entry.startTime);
          return entryDate >= thirtyDaysAgo;
        });
        const invoicedEarningsLast30Days = last30DaysInvoicedEntries.reduce((sum, entry) => {
          const rate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
          return sum + (rate * (entry.duration || 0) / 60);
        }, 0);
        
        setStats({
          totalHours: totalHoursThisMonth.toFixed(1),
          totalHoursLast30Days: totalHoursLast30Days.toFixed(1),
          totalEarningsThisMonth: parseFloat(totalEarningsThisMonth.toFixed(2)),
          totalEarningsLast30Days: parseFloat(totalEarningsLast30Days.toFixed(2)),
          totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
          totalHoursInvoiced: totalHoursInvoiced.toFixed(1),
          unInvoicedEarnings: parseFloat(unInvoicedEarnings.toFixed(2)),
          invoicedEarningsThisMonth: parseFloat(invoicedEarningsThisMonth.toFixed(2)),
          invoicedEarningsLast30Days: parseFloat(invoicedEarningsLast30Days.toFixed(2)),
          currentMonthName: getCurrentMonthName()
        });
        
        // Start animation after data is loaded
        setTimeout(() => setIsLoading(false), 100);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    }
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  return (
    <Container padding="40px" style={{ height: '100vh', overflowY: 'auto' }}>
      <Title margin="0 0 30px 0">Reports</Title>
      
      <Grid gap="20px" margin="0 0 40px 0">
        {/* Total Hours This Month */}
        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background={colors.success} rounded>
              <Clock size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">September Hours</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">
            <AnimatedNumber 
              value={stats.totalHours} 
              isAnimating={!isLoading}
              duration={1000}
            />
          </BigNumber>
          <Text variant="secondary" size="small">This month</Text>
        </Card>

        {/* Total Earnings This Month */}
        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background={colors.primary} rounded>
              <DollarSign size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">{stats.currentMonthName} Earnings</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">
            <AnimatedNumber 
              value={stats.totalEarningsThisMonth} 
              formatFunction={formatCurrency}
              isAnimating={!isLoading}
              duration={1000}
            />
          </BigNumber>
          <Text variant="secondary" size="small">This month</Text>
        </Card>

        {/* Invoiced Earnings This Month */}
        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background="#16a34a" rounded>
              <DollarSign size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">{stats.currentMonthName} Invoiced</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">
            <AnimatedNumber 
              value={stats.invoicedEarningsThisMonth} 
              formatFunction={formatCurrency}
              isAnimating={!isLoading}
              duration={1000}
            />
          </BigNumber>
          <Text variant="secondary" size="small">This month</Text>
        </Card>

        {/* Total Hours Last 30 Days */}
        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background="#065f46" rounded>
              <Clock size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">Total Hours</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">
            <AnimatedNumber 
              value={stats.totalHoursLast30Days} 
              isAnimating={!isLoading}
              duration={1000}
            />
          </BigNumber>
          <Text variant="secondary" size="small">Last 30 days</Text>
        </Card>

        {/* Last 30 Days Earnings */}
        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background={colors.warning} rounded>
              <DollarSign size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">Earnings</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">
            <AnimatedNumber 
              value={stats.totalEarningsLast30Days} 
              formatFunction={formatCurrency}
              isAnimating={!isLoading}
              duration={1000}
            />
          </BigNumber>
          <Text variant="secondary" size="small">Last 30 days</Text>
        </Card>

        {/* Invoiced Earnings Last 30 Days */}
        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background="#15803d" rounded>
              <DollarSign size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">Invoiced Earnings</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">
            <AnimatedNumber 
              value={stats.invoicedEarningsLast30Days} 
              formatFunction={formatCurrency}
              isAnimating={!isLoading}
              duration={1000}
            />
          </BigNumber>
          <Text variant="secondary" size="small">Last 30 days</Text>
        </Card>

        {/* Total Hours Invoiced */}
        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background="#8b5cf6" rounded>
              <Clock size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">Hours Invoiced</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">
            <AnimatedNumber 
              value={stats.totalHoursInvoiced} 
              isAnimating={!isLoading}
              duration={1000}
            />
          </BigNumber>
          <Text variant="secondary" size="small">All time</Text>
        </Card>
        {/* Invoiced Earnings All Time */}
        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background="#22c55e" rounded>
              <DollarSign size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">Invoiced Earnings</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">
            <AnimatedNumber 
              value={stats.totalInvoiced} 
              formatFunction={formatCurrency}
              isAnimating={!isLoading}
              duration={1000}
            />
          </BigNumber>
          <Text variant="secondary" size="small">All time</Text>
        </Card>


        {/* Un-Invoiced Earnings */}
        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background="#ef4444" rounded>
              <DollarSign size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">Un-Invoiced Earnings</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">
            <AnimatedNumber 
              value={stats.unInvoicedEarnings} 
              formatFunction={formatCurrency}
              isAnimating={!isLoading}
              duration={1000}
            />
          </BigNumber>
          <Text variant="secondary" size="small">All time</Text>
        </Card>
      </Grid>
    </Container>
  );
};

export default Reports;
