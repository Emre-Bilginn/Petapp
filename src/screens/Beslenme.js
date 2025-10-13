import { SafeAreaView } from 'react-native-safe-area-context';
﻿import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CustomButton, CustomTextInput } from '../components/Index';

const SPECIES = [
  { id: 'dog', label: 'Köpek', icon: '🐶', baseFactor: 9.5 },
  { id: 'cat', label: 'Kedi', icon: '🐱', baseFactor: 7.2 },
  { id: 'bird', label: 'Kuş', icon: '🐦', baseFactor: 4.5 },
];

const AGE_GROUPS = [
  { id: 'young', label: 'Yavru', multiplier: 1.25 },
  { id: 'adult', label: 'Yetişkin', multiplier: 1 },
  { id: 'senior', label: 'Yaşlı', multiplier: 0.85 },
];

const DIET_TYPES = [
  { id: 'balanced', label: 'Dengeli Beslenme', multiplier: 1 },
  { id: 'weight-control', label: 'Kilo Kontrolü', multiplier: 0.9 },
  { id: 'high-energy', label: 'Enerji Takviyesi', multiplier: 1.1 },
];

const FOOD_LIBRARY = [
  { id: 'dog-1', species: 'dog', diets: ['balanced', 'high-energy'], label: 'Royal Canin Maxi Adult' },
  { id: 'dog-2', species: 'dog', diets: ['balanced'], label: 'Pro Plan Somon & Pirinç' },
  { id: 'dog-3', species: 'dog', diets: ['weight-control'], label: "Hill's Science Diet Light" },
  { id: 'dog-4', species: 'dog', diets: ['balanced', 'high-energy'], label: 'Acana Cobb Chicken & Greens' },
  { id: 'dog-5', species: 'dog', diets: ['balanced'], label: 'N&D Balkabağı & Kuzu' },
  { id: 'cat-1', species: 'cat', diets: ['balanced'], label: 'Orijen Six Fish Cat' },
  { id: 'cat-2', species: 'cat', diets: ['weight-control'], label: 'Pro Plan Urinary Care' },
  { id: 'cat-3', species: 'cat', diets: ['balanced', 'high-energy'], label: "Hill's Science Diet Kitten" },
  { id: 'cat-4', species: 'cat', diets: ['balanced'], label: 'N&D Tavuk & Nar' },
  { id: 'bird-1', species: 'bird', diets: ['balanced'], label: 'Versele-Laga Prestige Muhabbet Kuşu' },
  { id: 'bird-2', species: 'bird', diets: ['high-energy'], label: 'Vitakraft African Parrot Mix' },
  { id: 'bird-3', species: 'bird', diets: ['balanced'], label: 'Tropican Cockatiel Granül' },
];

const NUTRITION_TIPS = {
  dog: [
    'Mama değiştirirken en az 5 gün boyunca eski mama ile karıştırarak geçiş yap.',
    'Günlük porsiyonu ikiye bölerek sabah-akşam servis etmek sindirimi rahatlatır.',
    'Taze su kabını her gün yıka ve doldur.',
  ],
  cat: [
    'Mama kabını sakin bir köşeye yerleştir, kum kabından uzak tut.',
    'Yaş mama ile desteklemek su tüketimini artırır.',
    'Kuru mamayı hava almayan kapta sakla, bayatlamasını önle.',
  ],
  bird: [
    'Tohum temelli beslenmeyi vitamin-mineral takviyeleriyle destekle.',
    'Beslenme kabını günlük temizle, taze mama ekle.',
    'Avuç içi kadar taze yeşillik sağlayarak doğal lif alımını artır.',
  ],
};

const BeslenmeSayfasi = () => {
  const [species, setSpecies] = useState('dog');
  const [ageGroup, setAgeGroup] = useState('adult');
  const [dietType, setDietType] = useState('balanced');
  const [weightInput, setWeightInput] = useState('');
  const [recommendedAmount, setRecommendedAmount] = useState('');
  const [selectedFoodIds, setSelectedFoodIds] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const parsedWeight = useMemo(() => {
    const normalized = weightInput.replace(',', '.');
    const value = parseFloat(normalized);
    return Number.isFinite(value) ? Math.abs(value) : null;
  }, [weightInput]);

  const filteredFoods = useMemo(() => {
    return FOOD_LIBRARY.filter(
      (item) => item.species === species && (item.diets.includes(dietType) || item.diets.includes('balanced'))
    );
  }, [species, dietType]);

  const nutritionTips = useMemo(() => NUTRITION_TIPS[species] ?? [], [species]);

  const handleCalculate = () => {
    if (!parsedWeight) {
      setErrorMessage('Lütfen kilogram cinsinden geçerli bir ağırlık gir.');
      setRecommendedAmount('');
      return;
    }

    const speciesFactor = SPECIES.find((item) => item.id === species)?.baseFactor ?? 8;
    const ageFactor = AGE_GROUPS.find((item) => item.id === ageGroup)?.multiplier ?? 1;
    const dietFactor = DIET_TYPES.find((item) => item.id === dietType)?.multiplier ?? 1;

    const amount = speciesFactor * parsedWeight * ageFactor * dietFactor;
    const rounded = Math.round(amount);
    setRecommendedAmount(`${rounded} gram / gün`);
    setErrorMessage('');
  };

  const toggleFood = (foodId) => {
    setSelectedFoodIds((prev) =>
      prev.includes(foodId) ? prev.filter((id) => id !== foodId) : [...prev, foodId]
    );
  };

  const handleAddToShoppingList = () => {
    if (!selectedFoodIds.length) {
      setErrorMessage('Sepete eklemeden önce en az bir mama seç.');
      return;
    }

    const selectedLabels = filteredFoods
      .filter((food) => selectedFoodIds.includes(food.id))
      .map((food) => food.label);

    const merged = Array.from(new Set([...shoppingList, ...selectedLabels]));
    setShoppingList(merged);
    setSelectedFoodIds([]);
    setErrorMessage('');
  };

  const handleClearShoppingList = () => {
    setShoppingList([]);
    setSelectedFoodIds([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Beslenme Planı</Text>
          <Text style={styles.heroSubtitle}>
            Evcil dostun için günlük mama miktarını hesapla, ona uygun ürünleri seç ve alışveriş listeni oluştur.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Hayvan Türü</Text>
          <View style={styles.optionRow}>
            {SPECIES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionChip, species === item.id && styles.optionChipActive]}
                onPress={() => setSpecies(item.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.optionIcon}>{item.icon}</Text>
                <Text style={[styles.optionLabel, species === item.id && styles.optionLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>2. Yaş Aralığı</Text>
          <View style={styles.optionRow}>
            {AGE_GROUPS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionPill, ageGroup === item.id && styles.optionPillActive]}
                onPress={() => setAgeGroup(item.id)}
              >
                <Text style={[styles.optionPillText, ageGroup === item.id && styles.optionPillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>3. Diyet Hedefi</Text>
          <View style={styles.optionRow}>
            {DIET_TYPES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionPill, dietType === item.id && styles.optionPillActive]}
                onPress={() => setDietType(item.id)}
              >
                <Text style={[styles.optionPillText, dietType === item.id && styles.optionPillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>4. Ağırlık (kg)</Text>
          <CustomTextInput
            title="Ağırlık"
            isSecureText={false}
            keyboardType="decimal-pad"
            handleOnChangeText={setWeightInput}
            handleValue={weightInput}
            handlePlaceHolder="Örn. 12.5"
            helperText="Kilogram cinsinden gir. Nokta veya virgül kullanabilirsin."
            containerStyle={styles.inputWrapper}
          />
          <CustomButton
            buttonText="Mama Miktarını Hesapla"
            setWidth="100%"
            handleOnPress={handleCalculate}
            buttonColor="#0eb37d"
            pressedButtonColor="#0a8c61"
          />
          {recommendedAmount ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Önerilen Günlük Porsiyon</Text>
              <Text style={styles.resultValue}>{recommendedAmount}</Text>
            </View>
          ) : null}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Önerilen Mamalar</Text>
          <Text style={styles.sectionSubtitle}>
            Seçtiğin kriterlere göre önerilen ürünleri işaretleyip alışveriş listene ekleyebilirsin.
          </Text>
          <FlatList
            data={filteredFoods}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const isSelected = selectedFoodIds.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.foodRow, isSelected && styles.foodRowSelected]}
                  onPress={() => toggleFood(item.id)}
                >
                  <Text style={[styles.foodLabel, isSelected && styles.foodLabelSelected]}>{item.label}</Text>
                  {isSelected ? <Text style={styles.foodSelectedBadge}>Seçildi</Text> : null}
                </TouchableOpacity>
              );
            }}
          />
          <CustomButton
            buttonText="Sepete Ekle"
            setWidth="100%"
            handleOnPress={handleAddToShoppingList}
            buttonColor="#0b6aa2"
            pressedButtonColor="#084d73"
            isDisabled={!filteredFoods.length}
          />
          {shoppingList.length ? (
            <View style={styles.shoppingList}>
              <View style={styles.shoppingHeader}>
                <Text style={styles.shoppingTitle}>Alışveriş Listesi</Text>
                <TouchableOpacity onPress={handleClearShoppingList}>
                  <Text style={styles.clearButton}>Temizle</Text>
                </TouchableOpacity>
              </View>
              {shoppingList.map((item) => (
                <Text key={item} style={styles.shoppingItem}>• {item}</Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Beslenme İpuçları</Text>
          {nutritionTips.map((tip, index) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.tipBullet}>
                <Text style={styles.tipBulletText}>{index + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BeslenmeSayfasi;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f9fc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroCard: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#041523',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  card: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#041523',
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.6)',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 10,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 24, 40, 0.12)',
    backgroundColor: '#ffffff',
  },
  optionChipActive: {
    borderColor: 'rgba(14, 179, 125, 0.45)',
    backgroundColor: 'rgba(14, 179, 125, 0.12)',
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: 'rgba(6, 24, 40, 0.7)',
  },
  optionLabelActive: {
    color: '#0a8c61',
    fontWeight: '700',
  },
  optionPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 24, 40, 0.12)',
    backgroundColor: '#ffffff',
  },
  optionPillActive: {
    borderColor: 'rgba(11, 106, 162, 0.35)',
    backgroundColor: 'rgba(11, 106, 162, 0.12)',
  },
  optionPillText: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  optionPillTextActive: {
    color: '#0b6aa2',
    fontWeight: '600',
  },
  inputWrapper: {
    marginTop: 12,
    marginBottom: 18,
  },
  resultBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 179, 125, 0.12)',
  },
  resultLabel: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  resultValue: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '700',
    color: '#0a8c61',
  },
  errorText: {
    marginTop: 12,
    fontSize: 12,
    color: '#e53935',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(6, 24, 40, 0.08)',
    marginVertical: 6,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  foodRowSelected: {
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(11, 106, 162, 0.1)',
  },
  foodLabel: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(6, 24, 40, 0.75)',
  },
  foodLabelSelected: {
    fontWeight: '700',
    color: '#0b6aa2',
  },
  foodSelectedBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0b6aa2',
  },
  shoppingList: {
    marginTop: 20,
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(14, 179, 125, 0.08)',
  },
  shoppingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shoppingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a8c61',
  },
  clearButton: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e53935',
  },
  shoppingItem: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.75)',
    marginTop: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  tipBullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(11, 106, 162, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipBulletText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0b6aa2',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.75)',
    lineHeight: 18,
  },
});
