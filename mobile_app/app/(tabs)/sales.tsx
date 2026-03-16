import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Colors, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { productService, transactionService, cardService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SOCKET_URL } from '@/constants/config';
import io from 'socket.io-client';
import { useFocusEffect } from 'expo-router';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface Product {
  _id: string;
  id?: string;
  name: string;
  price: number;
  icon: string;
  stock: number;
  category: any;
}

interface CartItem {
  product: Product;
  qty: number;
}

export default function SalesScreen() {
  const [activeTab, setActiveTab] = useState<'card' | 'market'>('card');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [scannedCard, setScannedCard] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [scannerId, setScannerId] = useState('reader-1');
  const [receiptData, setReceiptData] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Socket setup for card scanning
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('card-status', async (data) => {
      if (data.deviceId && data.deviceId !== scannerId) return;
      
      try {
        const card = await cardService.getCard(data.uid);
        setScannedCard(card);
      } catch (err) {
        setScannedCard({ 
            uid: data.uid, 
            holderName: 'Unregistered Card', 
            balance: 0, 
            status: 'New',
            isUnregistered: true 
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [scannerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([
        productService.getProducts(),
        productService.getCategories(),
      ]);
      setProducts(prodData.map((p: any) => ({ ...p, _id: p._id || p.id })));
      setCategories(catData.map((c: any) => ({ ...c, _id: c._id || c.id || c.slug })));
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      Alert.alert('Out of Stock', 'This item is currently unavailable');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        const available = product.stock;
        if (existing.qty >= available) {
            Alert.alert('Stock Limit', 'Cannot add more: Stock limit reached');
            return prev;
        }
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const newCart = prev.map((item) => {
        if (item.product._id === productId) {
          const newQty = item.qty + delta;
          if (newQty <= 0) return { ...item, qty: 0 };
          if (newQty > item.product.stock) return item;
          return { ...item, qty: newQty };
        }
        return item;
      }).filter(item => item.qty > 0);

      // Close checkout modal if cart becomes empty
      if (newCart.length === 0) {
        setCheckoutVisible(false);
      }
      return newCart;
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const startCheckout = async () => {
    if (cart.length === 0) return;
    
    // Web logic: Reserve stock for 5 mins
    try {
        const items = cart.map(i => ({ productId: i.product._id, qty: i.qty }));
        const sessionId = user?.id || Date.now().toString();
        await productService.reserveProducts(items, sessionId);
        setCheckoutVisible(true);
    } catch (error: any) {
        Alert.alert('Reservation Failed', error.message || 'Could not lock stock for checkout');
    }
  };

  const handleCloseReceipt = () => {
    setCart([]);
    setCheckoutVisible(false);
    setPasscode('');
    setReceiptData(null);
    fetchData(); // Refresh stock
    if (scannedCard) {
        cardService.getCard(scannedCard.uid).then(setScannedCard).catch(() => {});
    }
  };

  const handlePay = async () => {
    if (!scannedCard) {
      Alert.alert('No Card Scanned', 'Please scan an RFID card to pay');
      return;
    }

    if (scannedCard.balance < cartTotal) {
      Alert.alert('Insufficient Balance', 'Card balance is too low');
      return;
    }

    if (scannedCard.passcodeSet && passcode.length !== 6) {
        Alert.alert('Passcode Required', 'Please enter your 6-digit card passcode');
        return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        uid: scannedCard.uid,
        amount: cartTotal,
        items: cart.map(i => ({ id: i.product._id, name: i.product.name, price: i.product.price, qty: i.qty })),
        processedBy: user?.username,
        deviceId: scannerId,
        passcode: scannedCard.passcodeSet ? passcode : undefined
      };

      const result = await transactionService.pay(payload);
      
      if (result.success) {
        setReceiptData({
            transaction: result.transaction,
            card: result.card,
            items: cart
        });
      }
    } catch (error: any) {
      Alert.alert('Payment Failed', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => {
        if (typeof p.category === 'string') return p.category === selectedCategory;
        return p.category?.slug === selectedCategory;
    });

  const CardView = () => (
    <Animated.View entering={FadeInDown.duration(600)} style={styles.sectionContent}>
        <View style={styles.cardPreviewContainer}>
            <LinearGradient
                colors={['#1e293b', '#0f172a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.visualCard}
            >
                <View style={styles.cardChip} />
                <Text style={styles.cardNumber}>**** **** **** ****</Text>
                <View style={styles.cardFooter}>
                    <View>
                        <Text style={styles.cardLabelText}>CARD HOLDER</Text>
                        <Text style={styles.cardValueText}>{scannedCard?.holderName || 'NO CARD DETECTED'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.cardLabelText}>BALANCE</Text>
                        <Text style={[styles.cardValueText, { color: '#fbbf24' }]}>
                            Frw {scannedCard?.balance?.toLocaleString() || '0'}
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </View>

        <PremiumCard style={styles.infoCard}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>📋 Card Information</Text>
            {!scannedCard ? (
                <View style={styles.emptyInfo}>
                    <Animated.View 
                        entering={FadeInDown.delay(300).duration(800)}
                        style={{ alignItems: 'center' }}
                    >
                        <Ionicons name="radio" size={60} color={theme.primary + '40'} />
                        <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 16, fontWeight: '600' }}>
                            Place an RFID card on the reader and wait for details to appear...
                        </Text>
                    </Animated.View>
                </View>
            ) : (
                <View style={styles.infoList}>
                    <InfoRow label="UID" value={scannedCard.uid} mono />
                    <InfoRow label="Status" value={scannedCard.status || 'Active'} color={theme.success} />
                    <InfoRow 
                        label="Passcode" 
                        value={scannedCard.passcodeSet ? '🔒 Protected' : '⚠️ Not Set'} 
                        color={scannedCard.passcodeSet ? theme.success : theme.warning} 
                    />
                    {scannedCard.email && <InfoRow label="Email" value={scannedCard.email} />}
                    {scannedCard.isUnregistered && (
                        <View style={{ backgroundColor: theme.danger + '10', padding: 12, borderRadius: 12, marginTop: 16 }}>
                            <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                                Card not found in database. Please register it first.
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </PremiumCard>
    </Animated.View>
  );

  const MarketplaceView = () => (
    <View style={styles.marketContainer}>
        <Animated.View entering={FadeInRight.duration(600)} style={styles.categoryWrapper}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContent}
            >
                <TouchableOpacity
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync();
                        setSelectedCategory('all');
                    }}
                    style={[
                        styles.catBtn,
                        selectedCategory === 'all' 
                            ? { backgroundColor: theme.primary, borderColor: theme.primary } 
                            : { backgroundColor: theme.card, borderColor: theme.border }
                    ]}
                >
                    <Text style={[styles.catBtnText, selectedCategory === 'all' ? { color: 'white' } : { color: theme.text }]}>All Items</Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                    <TouchableOpacity
                        key={cat._id}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.selectionAsync();
                            setSelectedCategory(cat.slug);
                        }}
                        style={[
                            styles.catBtn,
                            selectedCategory === cat.slug 
                                ? { backgroundColor: theme.primary, borderColor: theme.primary } 
                                : { backgroundColor: theme.card, borderColor: theme.border }
                        ]}
                    >
                        <View style={[
                            styles.catIconWrap, 
                            selectedCategory === cat.slug ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: theme.background }
                        ]}>
                            <Text style={styles.catIconText}>{cat.icon}</Text>
                        </View>
                        <Text style={[styles.catBtnText, selectedCategory === cat.slug ? { color: 'white' } : { color: theme.text }]}>{cat.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </Animated.View>


        <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item._id}
            numColumns={2}
            columnWrapperStyle={styles.prodRow}
            contentContainerStyle={styles.prodList}
            renderItem={({ item, index }) => {
                const inCart = cart.find(i => i.product._id === item._id);
                return (
                    <Animated.View entering={FadeInUp.delay(index * 50).duration(500)}>
                        <TouchableOpacity
                            style={[styles.prodCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.selectionAsync();
                                setSelectedProduct(item);
                                setDetailVisible(true);
                            }}
                        >
                            <TouchableOpacity 
                                style={[styles.quickAddBtn, { backgroundColor: theme.primary }]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    addToCart(item);
                                }}
                            >
                                <Ionicons name="add" size={20} color="white" />
                            </TouchableOpacity>

                            <Text style={styles.prodIcon}>{item.icon}</Text>
                            <Text style={[styles.prodName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                            <Text style={[styles.prodPrice, { color: theme.primary }]}>Frw {item.price.toLocaleString()}</Text>
                            <Text style={[styles.prodStock, { color: item.stock < 10 ? theme.danger : theme.muted }]}>
                                {item.stock} left
                            </Text>
                            {inCart && (
                                <View style={[styles.prodBadge, { backgroundColor: theme.primary }]}>
                                    <Text style={styles.prodBadgeText}>{inCart.qty}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                );
            }}
        />

        {cartCount > 0 && (
            <TouchableOpacity 
                style={[styles.cartBar, { backgroundColor: theme.primary }]} 
                onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    startCheckout();
                }}
            >
                <Ionicons name="cart" size={24} color="white" />
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.cartBarTotal}>Frw {cartTotal.toLocaleString()}</Text>
                    <Text style={styles.cartBarSub}>{cartCount} items selected</Text>
                </View>
                <Text style={styles.checkoutText}>Checkout →</Text>
            </TouchableOpacity>
        )}
    </View>
  );



  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient 
        colors={[theme.primary, theme.secondary]} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
            <View>
                <Text style={styles.headerTitle}>Sales Terminal</Text>
                <Text style={styles.headerSubtitle}>{user?.fullName} • 💼 Merchant</Text>
            </View>
            <TouchableOpacity 
                style={styles.terminalBtn}
                onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const next = scannerId === 'reader-1' ? 'reader-2' : scannerId === 'reader-2' ? 'reader-3' : 'reader-1';
                    setScannerId(next);
                    Alert.alert('Terminal Switched', `Now connected to ${next}`);
                }}
            >
                <Ionicons name="radio" size={16} color="white" />
                <Text style={styles.terminalText}>{scannerId.toUpperCase()}</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
            <TabItem label="Scan Card" icon="radio-outline" active={activeTab === 'card'} onPress={() => setActiveTab('card')} />
            <TabItem label="Market" icon="cart-outline" active={activeTab === 'market'} onPress={() => setActiveTab('market')} />
        </View>
      </LinearGradient>

      {activeTab === 'card' && <CardView />}
      {activeTab === 'market' && <MarketplaceView />}

      {/* Checkout Modal */}
      <Modal visible={checkoutVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Checkout</Text>
                    <TouchableOpacity onPress={() => setCheckoutVisible(false)}>
                        <Ionicons name="close-circle" size={32} color={theme.muted} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionLabel}>Order Summary</Text>
                    {cart.map(item => (
                        <View key={item.product._id} style={styles.cartReviewRow}>
                            <Text style={styles.cartReviewIcon}>{item.product.icon}</Text>
                            
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={[styles.cartReviewName, { color: theme.text, flex: 1 }]} numberOfLines={1}>{item.product.name}</Text>
                                    <Text style={[styles.cartReviewTotal, { color: theme.text, marginLeft: 12 }]}>Frw {(item.product.price * item.qty).toLocaleString()}</Text>
                                </View>
                                
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}>Frw {item.product.price.toLocaleString()} each</Text>
                                    
                                    <View style={[styles.cartQtyControls, { backgroundColor: theme.primary + '15' }]}>
                                        <TouchableOpacity 
                                            style={[styles.qtyBtn, { backgroundColor: theme.card }]} 
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                updateQty(item.product._id, -1);
                                            }}
                                        >
                                            <Ionicons name="remove" size={18} color={theme.text} />
                                        </TouchableOpacity>
                                        <Text style={[styles.qtyText, { color: theme.text }]}>{item.qty}</Text>
                                        <TouchableOpacity 
                                            style={[styles.qtyBtn, { backgroundColor: theme.card }]} 
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                updateQty(item.product._id, 1);
                                            }}
                                        >
                                            <Ionicons name="add" size={18} color={theme.text} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}

                    <PremiumCard style={styles.totalBox}>
                        <View style={styles.totalRow}>
                            <Text style={{ color: theme.muted, fontWeight: '700', fontSize: 16 }}>Amount Due</Text>
                            <Text style={[styles.totalValue, { color: theme.primary }]}>Frw {cartTotal.toLocaleString()}</Text>
                        </View>
                    </PremiumCard>

                    <Text style={[styles.sectionLabel, { marginTop: 32 }]}>Payment Method</Text>
                    {!scannedCard ? (
                        <View style={styles.paymentWait}>
                            <ActivityIndicator size="small" color={theme.primary} />
                            <Text style={{ color: theme.primary, marginLeft: 12, fontWeight: '700' }}>Waiting for RFID scan...</Text>
                        </View>
                    ) : (
                        <PremiumCard style={[styles.payCardInfo, { borderColor: theme.primary + '30' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{ backgroundColor: theme.primary + '15', padding: 8, borderRadius: 8 }}>
                                    <Ionicons name="card" size={22} color={theme.primary} />
                                </View>
                                <Text style={[styles.payCardText, { color: theme.text }]}>{scannedCard.holderName}</Text>
                            </View>
                            <View style={styles.payBalanceRow}>
                                <Text style={{ color: theme.muted, fontWeight: '600' }}>Card Balance</Text>
                                <Text style={{ color: theme.success, fontWeight: '800', fontSize: 16 }}>Frw {scannedCard.balance.toLocaleString()}</Text>
                            </View>

                            {scannedCard.passcodeSet && (
                                <View style={styles.passInputWrap}>
                                    <Text style={[styles.passLabel, { color: theme.text }]}>Enter Card Passcode</Text>
                                    <TextInput
                                        style={[styles.passInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                                        secureTextEntry
                                        keyboardType="numeric"
                                        maxLength={6}
                                        value={passcode}
                                        onChangeText={setPasscode}
                                        placeholder="••••••"
                                        placeholderTextColor={theme.muted}
                                    />
                                </View>
                            )}
                        </PremiumCard>
                    )}
                </ScrollView>

                <View style={styles.modalFooter}>
                    <PremiumButton
                        title={isProcessing ? "Processing..." : "Confirm Payment"}
                        onPress={handlePay}
                        disabled={!scannedCard || isProcessing}
                        variant="success"
                        loading={isProcessing}
                        style={styles.payConfirmBtn}
                    />
                </View>
            </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={!!receiptData} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.receiptModalContent, { backgroundColor: theme.background }]}>
                <View style={styles.receiptHeader}>
                    <Animated.View entering={FadeInUp.duration(600)} style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={44} color="white" />
                    </Animated.View>
                    <Text style={[styles.receiptTitle, { color: theme.text }]}>Payment Success!</Text>
                    <Text style={{ color: theme.muted, marginTop: 8, fontWeight: '600' }}>
                        {new Date(receiptData?.transaction?.timestamp || Date.now()).toLocaleString()}
                    </Text>
                </View>

                <ScrollView style={styles.receiptBody} showsVerticalScrollIndicator={false}>
                    <View style={[styles.receiptCard, { backgroundColor: theme.card }]}>
                        {receiptData?.items.map((item: any) => (
                            <View key={item.product._id} style={styles.receiptRow}>
                                <Text style={[styles.receiptItemText, { color: theme.text }]} numberOfLines={1}>
                                    {item.qty}x {item.product.name}
                                </Text>
                                <Text style={[styles.receiptItemPrice, { color: theme.text }]}>
                                    Frw {(item.product.price * item.qty).toLocaleString()}
                                </Text>
                            </View>
                        ))}
                        
                        <View style={styles.receiptDivider} />
                        
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptTotalLabel}>Grand Total</Text>
                            <Text style={[styles.receiptTotalValue, { color: theme.success }]}>
                                Frw {receiptData?.transaction?.amount?.toLocaleString()}
                            </Text>
                        </View>
                        
                        <View style={styles.receiptDivider} />
                        
                        <View style={styles.receiptRow}>
                            <Text style={{ color: theme.muted, fontWeight: '600' }}>Cardholder</Text>
                            <Text style={[styles.receiptItemText, { color: theme.text, textAlign: 'right' }]}>{receiptData?.card?.holderName}</Text>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={{ color: theme.muted, fontWeight: '600' }}>New Balance</Text>
                            <Text style={[styles.receiptItemText, { color: theme.success, textAlign: 'right', fontWeight: '800' }]}>Frw {receiptData?.transaction?.balanceAfter?.toLocaleString()}</Text>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={{ color: theme.muted, fontWeight: '600' }}>Transaction ID</Text>
                            <Text style={[styles.receiptItemText, { color: theme.muted, fontSize: 11, textAlign: 'right' }]}>{receiptData?.transaction?.receiptId}</Text>
                        </View>
                    </View>

                    <View style={styles.emailNotice}>
                        <Ionicons name="mail" size={24} color={theme.primary} />
                        <Text style={[styles.emailNoticeText, { color: theme.text }]}>
                            A digital receipt has been sent to the cardholder. You can also export this transaction.
                        </Text>
                    </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                    <PremiumButton
                        title="Finish Checkout"
                        onPress={handleCloseReceipt}
                        style={styles.payConfirmBtn}
                    />
                </View>
            </View>
        </View>
      </Modal>

      {/* Product Detail Modal */}
      <Modal visible={detailVisible && !!selectedProduct} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <Animated.View entering={FadeInDown.duration(400)} style={[styles.detailModalContent, { backgroundColor: theme.background }]}>
                <View style={[styles.detailHeader, { backgroundColor: theme.primary + '10' }]}>
                    <Text style={styles.detailIcon}>{selectedProduct?.icon}</Text>
                </View>
                
                <View style={styles.detailBody}>
                    <View style={styles.detailTitleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.detailName, { color: theme.text }]}>{selectedProduct?.name}</Text>
                            <Text style={[styles.detailCategory, { color: theme.primary }]}>
                                {typeof selectedProduct?.category === 'string' ? selectedProduct.category : selectedProduct?.category?.name}
                            </Text>
                        </View>
                        <Text style={[styles.detailPriceText, { color: theme.text }]}>Frw {selectedProduct?.price.toLocaleString()}</Text>
                    </View>

                    <Text style={[styles.detailDesc, { color: theme.muted }]}>
                        This is a premium product from our inventory. High quality guaranteed for all customers.
                    </Text>

                    <View style={styles.detailStats}>
                        <View style={[styles.detailStatBox, { backgroundColor: theme.card }]}>
                            <Ionicons name="cube-outline" size={20} color={theme.primary} />
                            <Text style={[styles.detailStatVal, { color: theme.text }]}>{selectedProduct?.stock}</Text>
                            <Text style={[styles.detailStatLab, { color: theme.muted }]}>In Stock</Text>
                        </View>
                        <View style={[styles.detailStatBox, { backgroundColor: theme.card }]}>
                            <Ionicons name="flash-outline" size={20} color="#fbbf24" />
                            <Text style={[styles.detailStatVal, { color: theme.text }]}>Fast Delivery</Text>
                            <Text style={[styles.detailStatLab, { color: theme.muted }]}>Available</Text>
                        </View>
                    </View>

                    <View style={styles.detailFooter}>
                        <PremiumButton
                            title="Close"
                            onPress={() => setDetailVisible(false)}
                            variant="outline"
                            style={{ flex: 1, marginRight: 12 }}
                        />
                        <PremiumButton
                            title="Add to Cart"
                            onPress={() => {
                                if (selectedProduct) addToCart(selectedProduct);
                                setDetailVisible(false);
                            }}
                            style={{ flex: 2 }}
                            gradient
                        />
                    </View>
                </View>
            </Animated.View>
        </View>
      </Modal>

    </View>
  );


}

function TabItem({ label, icon, active, onPress }: any) {
    return (
        <TouchableOpacity style={[styles.tabItem, active && styles.tabItemActive]} onPress={onPress}>
            <Ionicons name={icon} size={18} color={active ? 'white' : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.tabLabel, active && { color: 'white' }]}>{label}</Text>
        </TouchableOpacity>
    );
}

function InfoRow({ label, value, mono, color }: any) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, mono && { fontFamily: 'monospace' }, color && { color }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { 
    paddingTop: 50, 
    paddingBottom: 20, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
    ...Shadows.md,
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: Spacing.lg, 
    marginBottom: Spacing.lg 
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  terminalBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.3)' 
  },
  terminalText: { color: 'white', fontSize: 12, fontWeight: '800', marginLeft: 6 },
  
  // Tabs
  tabBar: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 10 },
  tabItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 14, 
    backgroundColor: 'rgba(255,255,255,0.1)' 
  },
  tabItemActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '800', marginLeft: 8 },
  
  // Card View
  sectionContent: { flex: 1, padding: Spacing.lg },
  cardPreviewContainer: { marginBottom: Spacing.xl },
  visualCard: { 
    height: 200, 
    borderRadius: 24, 
    padding: 24, 
    justifyContent: 'space-between', 
    ...Shadows.lg 
  },
  cardChip: { width: 45, height: 35, backgroundColor: '#e2e8f0', borderRadius: 8, opacity: 0.8 },
  cardNumber: { color: 'white', fontSize: 22, fontWeight: '700', letterSpacing: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardLabelText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  cardValueText: { color: 'white', fontSize: 16, fontWeight: '800', textTransform: 'uppercase' },
  
  infoCard: { padding: Spacing.lg },
  infoTitle: { fontSize: 18, fontWeight: '900', marginBottom: Spacing.lg, letterSpacing: -0.5 },
  infoList: { gap: 0 },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.05)' 
  },
  infoLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
  infoValue: { fontSize: 14, fontWeight: '800' },
  emptyInfo: { padding: 40, alignItems: 'center' },
  
  // Market View
  marketContainer: { flex: 1 },
  categoryWrapper: { paddingVertical: 14, zIndex: 10 },
  categoryScroll: { paddingLeft: Spacing.lg },
  categoryContent: { paddingRight: 32, gap: 12, alignItems: 'center' },
  catBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingRight: 16, 
    paddingLeft: 8, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1.5,
    ...Shadows.sm 
  },
  catIconWrap: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  catIconText: { fontSize: 16 },
  catBtnText: { fontSize: 14, fontWeight: '800' },
  
  prodList: { padding: Spacing.sm, paddingBottom: 150 },
  prodRow: { justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  prodCard: { 
    width: (width - 48) / 2, 
    borderRadius: 24, 
    padding: 16, 
    marginBottom: 16, 
    alignItems: 'center',
    ...Shadows.sm
  },
  prodIcon: { fontSize: 44, marginBottom: 10 },
  prodName: { fontSize: 15, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  prodPrice: { fontSize: 16, fontWeight: '900', marginVertical: 6 },
  prodStock: { fontSize: 12, fontWeight: '600' },
  prodBadge: { 
    position: 'absolute', 
    top: 12, 
    right: 12, 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    ...Shadows.sm
  },
  prodBadgeText: { color: 'white', fontSize: 12, fontWeight: '900' },
  
  cartBar: { 
    position: 'absolute', 
    bottom: Platform.OS === 'ios' ? 100 : 80, 
    left: 16, 
    right: 16, 
    height: 72, 
    borderRadius: 24, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    ...Shadows.lg 
  },
  cartBarTotal: { color: 'white', fontSize: 20, fontWeight: '900' },
  cartBarSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  checkoutText: { color: 'white', fontWeight: '900', fontSize: 15 },

  // Modals
  modalOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end', 
    zIndex: 1000 
  },
  modalContent: { 
    height: '85%', 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    paddingBottom: 30 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.05)' 
  },
  modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  modalBody: { flex: 1, padding: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' },
  cartReviewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cartReviewIcon: { fontSize: 28, marginRight: 16 },
  cartReviewName: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  cartReviewTotal: { fontSize: 15, fontWeight: '900' },
  cartQtyControls: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.04)', 
    borderRadius: 14, 
    padding: 4 
  },
  qtyBtn: { 
    width: 32, 
    height: 32, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 10, 
    backgroundColor: 'white',
    ...Shadows.sm
  },
  qtyText: { fontSize: 15, fontWeight: '800', marginHorizontal: 12, minWidth: 20, textAlign: 'center' },
  totalBox: { borderRadius: 24, padding: 20, marginTop: 10, ...Shadows.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalValue: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  paymentWait: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 24, 
    borderRadius: 20, 
    borderStyle: 'dashed', 
    borderWidth: 2, 
    borderColor: '#cbd5e1' 
  },
  payCardInfo: { borderRadius: 24, padding: 20, borderWidth: 1.5 },
  payCardText: { fontSize: 18, fontWeight: '900', marginLeft: 12, letterSpacing: -0.5 },
  payBalanceRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 16, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(0,0,0,0.05)' 
  },
  passInputWrap: { marginTop: 24 },
  passLabel: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  passInput: { 
    height: 64, 
    borderWidth: 1.5, 
    borderRadius: 20, 
    textAlign: 'center', 
    fontSize: 24, 
    letterSpacing: 10, 
    fontWeight: '900' 
  },
  modalFooter: { padding: 24 },
  payConfirmBtn: { 
    height: 64, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    ...Shadows.md 
  },
  payConfirmText: { color: 'white', fontSize: 18, fontWeight: '900' },

  receiptModalContent: { flex: 1, marginTop: 60, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
  receiptHeader: { alignItems: 'center', paddingTop: 40, paddingBottom: 24 },
  checkCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#10b981', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20, 
    ...Shadows.lg,
    shadowColor: '#10b981'
  },
  receiptTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  receiptBody: { flex: 1, padding: 24 },
  receiptCard: { borderRadius: 28, padding: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e2e8f0' },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  receiptItemText: { fontSize: 15, fontWeight: '700', flex: 1 },
  receiptItemPrice: { fontSize: 15, fontWeight: '900', marginLeft: 16 },
  receiptDivider: { 
    height: 1, 
    backgroundColor: '#e2e8f0', 
    marginVertical: 20, 
    borderStyle: 'dashed' 
  },
  receiptTotalLabel: { fontSize: 18, fontWeight: '800', color: '#64748b' },
  receiptTotalValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  emailNotice: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 18, 
    marginTop: 32, 
    marginBottom: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.1)' 
  },
  emailNoticeText: { flex: 1, marginLeft: 14, fontSize: 13, fontWeight: '700', lineHeight: 20 },

  // Detail Modal Styles
  quickAddBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...Shadows.sm,
  },
  detailModalContent: {
    height: '70%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
  },
  detailHeader: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 80,
  },
  detailBody: {
    flex: 1,
    padding: 32,
  },
  detailTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  detailCategory: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  detailPriceText: {
    fontSize: 22,
    fontWeight: '900',
  },
  detailDesc: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: '500',
  },
  detailStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  detailStatBox: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    ...Shadows.sm,
  },
  detailStatVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  detailStatLab: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  detailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

