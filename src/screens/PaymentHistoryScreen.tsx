// src/screens/PaymentHistoryScreen.tsx
// -----------------------------------------------------------------------------
// WHY: A single screen to let users view their payment history, filter by date,
// and download invoices individually or in bulk (ZIP).
//
// Uses:
//  - src/features/invoices/api.ts      (listInvoices, getInvoicePdfUrl, getInvoicesExportUrl)
//  - src/utils/file.ts                 (downloadAndShareFile)
//  - useAuth()                         (to get JWT token for requests)
//  - theme + global styles             (colors, spacing, g)
//
// Notes:
//  - Accepts DD-MM-YYYY OR YYYY-MM-DD in inputs; normalizes before request.
//  - Pagination via FlatList onEndReached.
//  - Export button downloads a ZIP for the current (normalized) range.
//  - Footer is pinned by flex layout so it sits at the bottom even on empty states.

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
// DES Added: Import DateTimePicker for native date selection
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
// DES Added: Import navigation hook for back functionality
import { useNavigation } from '@react-navigation/native';

import { g } from '../styles/global';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';

// DES Added: Import AppBackground component for consistent theming
import { AppBackground, Footer } from '../components';

import {
  listInvoices,
  type InvoiceItem,
  getInvoicePdfUrl,
  getInvoicesExportUrl,
} from '../features/invoices/api';

import { downloadAndShareFile } from '../utils/file';

// ---------------- Helpers ----------------
function formatMoney(pennies: number, currency: string) {
  const amount = (pennies / 100).toFixed(2);
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency + ' ';
  return `${symbol}${amount}`;
}

// DES Added: Helper to format invoice dates according to user's region
function formatInvoiceDate(iso: string): string {
  try {
    const date = new Date(iso);
    // DES Added: Use regional date formatting for invoice dates
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  } catch {
    return iso;
  }
}

// DES Added: Helper to format date according to user's region with better formatting
function formatDateForDisplay(date: Date | null): string {
  if (!date) return '';
  // DES Added: Use regional date formatting with proper options
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// DES Added: Helper to convert Date to YYYY-MM-DD format for API
function dateToApiFormat(date: Date | null): string | undefined {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Accepts 'DD-MM-YYYY' OR 'YYYY-MM-DD' (also allows slashes) and returns YYYY-MM-DD */
function normalizeDateInput(s: string): string | undefined {
  if (!s) return undefined;
  const t = s.trim().replace(/\//g, '-');

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  // DD-MM-YYYY -> YYYY-MM-DD
  const m = t.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  return undefined;
}

// DES Added: Enhanced invoice row component with modern card-like design
const InvoiceRow: React.FC<{
  item: InvoiceItem;
  onDownload: (item: InvoiceItem) => void;
}> = ({ item, onDownload }) => {
  // DES Added: Status badge styling based on invoice status
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'paid' || statusLower === 'completed') {
      return {
        bg: '#ECFDF5',
        border: '#A7F3D0',
        text: '#065F46',
        dot: '#10B981',
      };
    }
    if (statusLower === 'pending') {
      return {
        bg: '#FEF3C7',
        border: '#FDE68A',
        text: '#92400E',
        dot: '#F59E0B',
      };
    }
    // Default for other statuses
    return {
      bg: '#F3F4F6',
      border: '#E5E7EB',
      text: colors.textSecondary,
      dot: '#9CA3AF',
    };
  };

  const statusBadge = getStatusBadge(item.status);

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 16,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        marginHorizontal: spacing.xl,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F2F4',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {/* DES Added: Left side content with enhanced typography */}
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ 
              color: colors.textPrimary, 
              fontWeight: '800',
              fontSize: 18
            }}>
              {formatMoney(item.amount, item.currency)}
            </Text>
            {/* DES Added: Status badge with dot indicator */}
            <View style={{
              backgroundColor: statusBadge.bg,
              borderColor: statusBadge.border,
              borderWidth: 1,
              paddingVertical: 3,
              paddingHorizontal: 8,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: spacing.sm,
            }}>
              <View style={{
                width: 4,
                height: 4,
                borderRadius: 999,
                backgroundColor: statusBadge.dot,
                marginRight: 4,
              }} />
              <Text style={{
                fontSize: 10,
                fontWeight: '700',
                color: statusBadge.text,
              }}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <Text style={{ 
            color: colors.textSecondary, 
            fontSize: 14,
            fontWeight: '500',
            marginBottom: 4
          }}>
            {formatInvoiceDate(item.createdAt)}
          </Text>
          
          <Text style={{ 
            color: '#9CA3AF', 
            fontSize: 12,
            fontWeight: '400'
          }}>
            Invoice #{item.id}
          </Text>
        </View>

        {/* DES Added: Enhanced download button with modern styling */}
        <TouchableOpacity
          onPress={() => onDownload(item)}
          style={{
            backgroundColor: colors.black,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <Text style={{ 
            color: colors.white, 
            fontWeight: '700',
            fontSize: 13
          }}>
            Download
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ------------- Main Screen -------------
const PAGE_SIZE = 20;

const PaymentHistoryScreen: React.FC = () => {
  const { token } = useAuth();
  // DES Added: Navigation hook for back functionality
  const navigation = useNavigation();
  // DES Added: FlatList ref to scroll to top/filters
  const flatListRef = useRef<FlatList>(null);
  // DES Added: ScrollView ref for empty state
  const scrollViewRef = useRef<ScrollView>(null);

  // DES Added: State for date picker functionality only (removed manual input states)
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState<boolean>(false);
  const [showToPicker, setShowToPicker] = useState<boolean>(false);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const canLoadMore = useMemo(() => items.length < total, [items.length, total]);

  const fetchPage = useCallback(
    async (pageNum: number, replace = false) => {
      try {
        if (pageNum === 1 && !replace) setLoading(true);
        if (pageNum > 1) setLoadingMore(true);

        // DES Added: Use only date picker values (removed manual input fallback)
        const fromFilter = dateToApiFormat(fromDate);
        const toFilter = dateToApiFormat(toDate);

        const data = await listInvoices({
          token,
          from: fromFilter,
          to: toFilter,
          page: pageNum,
          pageSize: PAGE_SIZE,
        });

        setTotal(data.total);
        setPage(pageNum);
        setItems((prev) => (replace || pageNum === 1 ? data.items : [...prev, ...data.items]));
      } catch (err: any) {
        console.error('[PaymentHistory] list error', err);
        Alert.alert('Error', err?.message || 'Failed to load invoices');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, fromDate, toDate]
  );

  useEffect(() => {
    // initial load
    fetchPage(1, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onApplyFilters = useCallback(() => {
    // DES Added: Validate date picker values only (removed manual input validation)
    const fromFilter = dateToApiFormat(fromDate);
    const toFilter = dateToApiFormat(toDate);

    // DES Added: Validate date range
    if (fromDate && toDate && fromDate > toDate) {
      Alert.alert('Invalid date range', 'From date cannot be after To date');
      return;
    }

    fetchPage(1, true);
  }, [fromDate, toDate, fetchPage]);

  const onClearFilters = useCallback(() => {
    // DES Added: Clear date picker states only (removed manual input clearing)
    setFromDate(null);
    setToDate(null);
    fetchPage(1, true);
  }, [fetchPage]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchPage(1, true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  const onEndReached = useCallback(() => {
    if (!loading && !loadingMore && canLoadMore) {
      fetchPage(page + 1);
    }
  }, [loading, loadingMore, canLoadMore, page, fetchPage]);

  const onDownloadOne = useCallback(async (inv: InvoiceItem) => {
    try {
      const url = getInvoicePdfUrl({ id: inv.id });
      await downloadAndShareFile(url, `${inv.id}.pdf`);
    } catch (err: any) {
      Alert.alert('Download failed', err?.message || 'Unable to download invoice');
    }
  }, []);

  const onExportZip = useCallback(async () => {
    try {
      // DES Added: Use date picker values for export only (removed manual input fallback)
      const fromFilter = dateToApiFormat(fromDate);
      const toFilter = dateToApiFormat(toDate);
      
      const url = getInvoicesExportUrl({
        from: fromFilter,
        to: toFilter,
      });
      await downloadAndShareFile(url, `invoices_${fromFilter || 'all'}_${toFilter || 'all'}.zip`);
    } catch (err: any) {
      Alert.alert('Export failed', err?.message || 'Unable to export invoices');
    }
  }, [fromDate, toDate]);

  // DES Added: Function to scroll back to filters section
  const scrollToFilters = useCallback(() => {
    // DES Added: Try FlatList first, then ScrollView for empty state
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    } else if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  return (
    <SafeAreaView style={[g.screen]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      {/* DES Added: Use AppBackground component for consistent theming */}
      <AppBackground>
        {/* DES Added: Changed from ScrollView to View to fix VirtualizedList nesting warning */}
        <View style={{ flex: 1 }}>
          {/* DES Added: Enhanced list content with better loading and empty states */}
          <View style={{ flex: 1, minHeight: 300 }}>
            {loading && items.length === 0 ? (
              /* DES Added: Beautiful loading state */
              <ScrollView 
                contentContainerStyle={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: spacing.xl,
                }}
              >
                <View style={{
                  backgroundColor: colors.white,
                  borderRadius: 20,
                  paddingVertical: spacing.xxl,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: '#F1F2F4',
                  width: '100%',
                }}>
                  <ActivityIndicator size="large" color={colors.brand} />
                  <Text style={{ 
                    marginTop: spacing.md, 
                    color: colors.textSecondary,
                    fontSize: 14,
                    fontWeight: '500'
                  }}>
                    Loading your invoices…
                  </Text>
                </View>
              </ScrollView>
            ) : items.length === 0 ? (
              /* DES Added: Enhanced empty state with scrollable container */
              <ScrollView 
                ref={scrollViewRef} // DES Added: Ref for scrolling in empty state
                contentContainerStyle={{
                  flex: 1,
                  paddingHorizontal: spacing.xl,
                }}
                showsVerticalScrollIndicator={false}
              >
                {/* DES Added: Filter section for empty state */}
                <View style={{
                  backgroundColor: colors.white,
                  borderRadius: 20,
                  marginTop: spacing.lg,
                  marginBottom: spacing.lg,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.lg,
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: '#EEF0F3',
                  overflow: 'hidden',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                        <View style={{
                          width: 6,
                          height: 24,
                          borderRadius: 999,
                          backgroundColor: colors.black,
                          marginRight: 10,
                        }} />
                        <Text style={{
                          fontSize: 22,
                          fontWeight: '800',
                          color: colors.textPrimary,
                        }}>
                          Payment History
                        </Text>
                      </View>
                      <Text style={{
                        color: colors.textSecondary,
                        fontSize: 14,
                        marginBottom: spacing.sm,
                      }}>
                        View and download your invoices
                      </Text>
                      
                      <View style={{
                        backgroundColor: '#F3F4F6',
                        borderRadius: 999,
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        alignSelf: 'flex-start',
                      }}>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>
                          {total} invoice{total !== 1 ? 's' : ''} total
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={onExportZip}
                      style={{
                        backgroundColor: colors.black,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 12,
                        shadowColor: '#000',
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }}
                    >
                      <Text style={{ color: colors.white, fontWeight: '700', fontSize: 13 }}>Export ZIP</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* DES Added: Filter card for empty state */}
                <View style={{
                  backgroundColor: colors.white,
                  borderRadius: 20,
                  marginBottom: spacing.lg,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.lg,
                  shadowColor: '#000',
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: '#F1F2F4',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                    <View style={{
                      width: 4,
                      height: 16,
                      borderRadius: 999,
                      backgroundColor: colors.brand,
                      marginRight: 8,
                    }} />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: colors.textPrimary,
                    }}>
                      Filter by Date
                    </Text>
                  </View>
                  
                  <Text style={{ 
                    color: colors.textSecondary, 
                    marginBottom: spacing.sm,
                    fontSize: 13
                  }}>
                    Select dates using the date picker
                  </Text>
                  
                  <View style={{ flexDirection: 'row', columnGap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: colors.textSecondary,
                        marginBottom: 4,
                      }}>
                        From Date
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowFromPicker(true)}
                        style={{
                          borderWidth: 1,
                          borderColor: '#E5E7EB',
                          borderRadius: 12,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          backgroundColor: colors.white,
                          minHeight: 44,
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          color: fromDate ? colors.textPrimary : '#9CA3AF',
                        }}>
                          {fromDate ? formatDateForDisplay(fromDate) : 'Select date'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: colors.textSecondary,
                        marginBottom: 4,
                      }}>
                        To Date
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowToPicker(true)}
                        style={{
                          borderWidth: 1,
                          borderColor: '#E5E7EB',
                          borderRadius: 12,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          backgroundColor: colors.white,
                          minHeight: 44,
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          color: toDate ? colors.textPrimary : '#9CA3AF',
                        }}>
                          {toDate ? formatDateForDisplay(toDate) : 'Select date'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', columnGap: spacing.sm, marginTop: spacing.md }}>
                    <TouchableOpacity
                      onPress={onApplyFilters}
                      style={{
                        flex: 1,
                        backgroundColor: colors.black,
                        paddingVertical: spacing.md,
                        borderRadius: 12,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }}
                    >
                      <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>Apply Filters</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={onClearFilters}
                      style={{
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.lg,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        backgroundColor: colors.bg || '#F9FAFB',
                      }}
                    >
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* DES Added: Empty state message */}
                <View style={{
                  backgroundColor: colors.white,
                  borderRadius: 20,
                  marginBottom: spacing.lg,
                  paddingVertical: spacing.xxl,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: '#F1F2F4',
                }}>
                  <View style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.md,
                  }}>
                    <Text style={{ fontSize: 24 }}>📄</Text>
                  </View>
                  <Text style={{ 
                    color: colors.textPrimary,
                    fontSize: 16,
                    fontWeight: '600',
                    marginBottom: 4
                  }}>
                    No invoices found
                  </Text>
                  <Text style={{ 
                    color: colors.textSecondary,
                    fontSize: 14,
                    textAlign: 'center',
                    marginBottom: spacing.lg
                  }}>
                    Try adjusting your date filters above
                  </Text>
                  {/* DES Added: Button to scroll back to filters section */}
                  <TouchableOpacity
                    onPress={scrollToFilters}
                    style={{
                      backgroundColor: colors.black,
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.sm,
                      borderRadius: 12,
                      shadowColor: '#000',
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    }}
                  >
                    <Text style={{
                      color: colors.white,
                      fontWeight: '700',
                      fontSize: 14
                    }}>
                      Try Different Dates
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* DES Added: Enhanced FlatList with card-based invoice rows and header components */
              <FlatList
                ref={flatListRef} // DES Added: Ref for scrolling to top/filters
                data={items}
                keyExtractor={(it) => it.id}
                renderItem={({ item }) => (
                  <InvoiceRow item={item} onDownload={onDownloadOne} />
                )}
                onEndReachedThreshold={0.5}
                onEndReached={onEndReached}
                refreshControl={
                  <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh}
                    colors={[colors.brand]}
                    tintColor={colors.brand}
                  />
                }
                ListHeaderComponent={() => (
                  <>
                    {/* DES Added: Header card moved to FlatList header */}
                    <View
                      style={{
                        backgroundColor: colors.white,
                        borderRadius: 20,
                        marginHorizontal: spacing.xl,
                        marginTop: spacing.lg,
                        marginBottom: spacing.lg,
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.lg,
                        shadowColor: '#000',
                        shadowOpacity: 0.06,
                        shadowRadius: 24,
                        shadowOffset: { width: 0, height: 8 },
                        elevation: 3,
                        borderWidth: 1,
                        borderColor: '#EEF0F3',
                        overflow: 'hidden',
                      }}
                    >
                      {/* DES Added: Decorative background blobs */}
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          top: -30,
                          right: -40,
                          width: 120,
                          height: 120,
                          borderRadius: 999,
                          backgroundColor: '#eaf4edff',
                        }}
                      />
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          bottom: -40,
                          left: -50,
                          width: 140,
                          height: 140,
                          borderRadius: 999,
                          backgroundColor: '#FBFBFD',
                        }}
                      />

                      {/* DES Added: Header content with status badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                            <View style={{
                              width: 6,
                              height: 24,
                              borderRadius: 999,
                              backgroundColor: colors.black,
                              marginRight: 10,
                            }} />
                            <Text style={{
                              fontSize: 22,
                              fontWeight: '800',
                              color: colors.textPrimary,
                            }}>
                              Payment History
                            </Text>
                          </View>
                          <Text style={{
                            color: colors.textSecondary,
                            fontSize: 14,
                            marginBottom: spacing.sm,
                          }}>
                            View and download your invoices
                          </Text>
                          
                          {/* DES Added: Total invoices badge */}
                          <View style={{
                            backgroundColor: '#F3F4F6',
                            borderRadius: 999,
                            paddingVertical: 4,
                            paddingHorizontal: 10,
                            alignSelf: 'flex-start',
                          }}>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>
                              {total} invoice{total !== 1 ? 's' : ''} total
                            </Text>
                          </View>
                        </View>

                        {/* DES Added: Enhanced export button */}
                        <TouchableOpacity
                          onPress={onExportZip}
                          style={{
                            backgroundColor: colors.black,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderRadius: 12,
                            shadowColor: '#000',
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 2,
                          }}
                        >
                          <Text style={{ color: colors.white, fontWeight: '700', fontSize: 13 }}>Export ZIP</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* DES Added: Filter card moved to FlatList header */}
                    <View style={{
                      backgroundColor: colors.white,
                      borderRadius: 20,
                      marginHorizontal: spacing.xl,
                      marginBottom: spacing.lg,
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.lg,
                      shadowColor: '#000',
                      shadowOpacity: 0.04,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 2,
                      borderWidth: 1,
                      borderColor: '#F1F2F4',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                        <View style={{
                          width: 4,
                          height: 16,
                          borderRadius: 999,
                          backgroundColor: colors.brand,
                          marginRight: 8,
                        }} />
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '700',
                          color: colors.textPrimary,
                        }}>
                          Filter by Date
                        </Text>
                      </View>
                      
                      <Text style={{ 
                        color: colors.textSecondary, 
                        marginBottom: spacing.sm,
                        fontSize: 13
                      }}>
                        Select dates using the date picker
                      </Text>
                      
                      <View style={{ flexDirection: 'row', columnGap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: colors.textSecondary,
                            marginBottom: 4,
                          }}>
                            From Date
                          </Text>
                          {/* DES Added: Date picker button for From date */}
                          <TouchableOpacity
                            onPress={() => setShowFromPicker(true)}
                            style={{
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                              borderRadius: 12,
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.sm,
                              backgroundColor: colors.white,
                              minHeight: 44,
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{
                              fontSize: 14,
                              color: fromDate ? colors.textPrimary : '#9CA3AF',
                            }}>
                              {fromDate ? formatDateForDisplay(fromDate) : 'Select date'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: colors.textSecondary,
                            marginBottom: 4,
                          }}>
                            To Date
                          </Text>
                          {/* DES Added: Date picker button for To date */}
                          <TouchableOpacity
                            onPress={() => setShowToPicker(true)}
                            style={{
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                              borderRadius: 12,
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.sm,
                              backgroundColor: colors.white,
                              minHeight: 44,
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{
                              fontSize: 14,
                              color: toDate ? colors.textPrimary : '#9CA3AF',
                            }}>
                              {toDate ? formatDateForDisplay(toDate) : 'Select date'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', columnGap: spacing.sm, marginTop: spacing.md }}>
                        <TouchableOpacity
                          onPress={onApplyFilters}
                          style={{
                            flex: 1,
                            backgroundColor: colors.black,
                            paddingVertical: spacing.md,
                            borderRadius: 12,
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 2,
                          }}
                        >
                          <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>Apply Filters</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={onClearFilters}
                          style={{
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.lg,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            backgroundColor: colors.bg || '#F9FAFB',
                          }}
                        >
                          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>Clear</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={{ 
                      padding: spacing.lg,
                      alignItems: 'center'
                    }}>
                      <ActivityIndicator size="small" color={colors.brand} />
                      <Text style={{
                        marginTop: spacing.xs,
                        color: colors.textSecondary,
                        fontSize: 12
                      }}>
                        Loading more…
                      </Text>
                    </View>
                  ) : (
                    <View style={{ height: spacing.xl }} />
                  )
                }
                contentContainerStyle={{ 
                  paddingBottom: spacing.lg
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        </View>
      </AppBackground>

      {/* DES Added: Footer component for consistent navigation */}
      <Footer />
      
      {/* DES Added: Modal-wrapped Date Pickers for better UX */}
      {/* From Date Picker Modal */}
      <Modal
        visible={showFromPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFromPicker(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <View style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: Platform.OS === 'ios' ? 34 : 20,
          }}>
            {/* DES Added: Modal header with title and action buttons */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F2F4',
            }}>
              <TouchableOpacity
                onPress={() => setShowFromPicker(false)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                <Text style={{
                  color: colors.textSecondary,
                  fontSize: 16,
                  fontWeight: '600'
                }}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.textPrimary,
              }}>Select From Date</Text>
              
              <TouchableOpacity
                onPress={() => {
                  setShowFromPicker(false);
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                <Text style={{
                  color: colors.brand,
                  fontSize: 16,
                  fontWeight: '600'
                }}>Done</Text>
              </TouchableOpacity>
            </View>
            
            {/* DES Added: Date picker with proper styling and centered alignment */}
            <View style={{
              paddingVertical: spacing.md,
              minHeight: Platform.OS === 'ios' ? 200 : 'auto', // DES Added: Ensure minimum height for iOS spinner
              backgroundColor: colors.white,
              alignItems: 'center', // DES Added: Center the date picker
              justifyContent: 'center',
            }}>
              <DateTimePicker
                value={fromDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setShowFromPicker(false);
                  }
                  if (selectedDate) {
                    setFromDate(selectedDate);
                  }
                }}
                maximumDate={new Date()} // DES Added: Prevent future dates
                style={{
                  backgroundColor: colors.white,
                  width: '100%',
                  height: Platform.OS === 'ios' ? 180 : 'auto', // DES Added: Explicit height for iOS
                }}
                textColor={colors.textPrimary} // DES Added: Ensure text is visible
                themeVariant="light" // DES Added: Light theme for better visibility
              />
            </View>
          </View>
        </View>
      </Modal>
      
      {/* To Date Picker Modal */}
      <Modal
        visible={showToPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowToPicker(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <View style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: Platform.OS === 'ios' ? 34 : 20,
          }}>
            {/* DES Added: Modal header with title and action buttons */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F2F4',
            }}>
              <TouchableOpacity
                onPress={() => setShowToPicker(false)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                <Text style={{
                  color: colors.textSecondary,
                  fontSize: 16,
                  fontWeight: '600'
                }}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.textPrimary,
              }}>Select To Date</Text>
              
              <TouchableOpacity
                onPress={() => {
                  setShowToPicker(false);
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                <Text style={{
                  color: colors.brand,
                  fontSize: 16,
                  fontWeight: '600'
                }}>Done</Text>
              </TouchableOpacity>
            </View>
            
            {/* DES Added: Date picker with proper styling and centered alignment */}
            <View style={{
              paddingVertical: spacing.md,
              minHeight: Platform.OS === 'ios' ? 200 : 'auto', // DES Added: Ensure minimum height for iOS spinner
              backgroundColor: colors.white,
              alignItems: 'center', // DES Added: Center the date picker
              justifyContent: 'center',
            }}>
              <DateTimePicker
                value={toDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setShowToPicker(false);
                  }
                  if (selectedDate) {
                    setToDate(selectedDate);
                  }
                }}
                maximumDate={new Date()} // DES Added: Prevent future dates
                minimumDate={fromDate} // DES Added: Ensure To date is after From date
                style={{
                  backgroundColor: colors.white,
                  width: '100%',
                  height: Platform.OS === 'ios' ? 180 : 'auto', // DES Added: Explicit height for iOS
                }}
                textColor={colors.textPrimary} // DES Added: Ensure text is visible
                themeVariant="light" // DES Added: Light theme for better visibility
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PaymentHistoryScreen;
