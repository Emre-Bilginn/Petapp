import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
} from 'react-native';

const BeslenmeSayfasi = () => {
  const [selectedAnimal, setSelectedAnimal] = useState('Köpek');
  const [weight, setWeight] = useState('');
  const [recommendedFood, setRecommendedFood] = useState('');
  const [shoppingList, setShoppingList] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [dietType, setDietType] = useState('');
  const [age, setAge] = useState('');

  const foodList = [
    { id: '1', name: 'Royal Canin Maxi Adult', type: 'Köpek' },
    { id: '2', name: 'Pro Plan Adult Salmon & Rice', type: 'Köpek' },
    { id: '3', name: "Hill's Science Diet Adult Lamb & Rice", type: 'Köpek' },
    { id: '4', name: 'Acana Adult Dog', type: 'Köpek' },
    { id: '5', name: 'Orijen Original Dog', type: 'Köpek' },
    { id: '6', name: 'N&D Grain Free Lamb & Blueberry Adult', type: 'Köpek' },
    { id: '7', name: 'Brit Care Adult Large Breed Lamb & Rice', type: 'Köpek' },
    { id: '8', name: 'Goody Adult Beef & Rice', type: 'Köpek' },
    { id: '9', name: 'Pedigree Adult Beef & Vegetables', type: 'Köpek' },
    { id: '11', name: 'Royal Canin Fit 32', type: 'Kedi' },
    { id: '12', name: 'Pro Plan Adult Urinary Care', type: 'Kedi' },
    { id: '13', name: "Hill's Science Diet Adult Indoor Cat", type: 'Kedi' },
    { id: '14', name: 'Acana Wild Prairie Cat', type: 'Kedi' },
    { id: '15', name: 'Orijen Six Fish Cat', type: 'Kedi' },
    { id: '16', name: 'N&D Grain Free Chicken & Pomegranate Adult Cat', type: 'Kedi' },
    { id: '19', name: 'Versele-Laga Prestige Budgies', type: 'Kuş' },
    { id: '20', name: 'Vitakraft African Parrot', type: 'Kuş' },
    { id: '21', name: 'Tropican Lifetime Formula Granules for Cockatiels', type: 'Kuş' },
  ];

  const calculateFoodAmount = () => {
    if (!weight || isNaN(weight)) return alert('Lütfen geçerli bir ağırlık giriniz.');
    let baseAmount = selectedAnimal === 'Köpek' ? weight * 10 : selectedAnimal === 'Kedi' ? weight * 8 : 50;
    if (age === 'Yavru') baseAmount *= 1.2;
    if (age === 'Yaşlı') baseAmount *= 0.8;
    if (dietType === 'Kilo Kontrolü') baseAmount *= 0.9;
    setRecommendedFood(`${baseAmount} gram`);
  };

  const toggleFoodSelection = (food) => {
    setSelectedFoods((prev) => prev.includes(food) ? prev.filter((item) => item !== food) : [...prev, food]);
  };

  const addToShoppingList = () => {
    setShoppingList([...shoppingList, ...selectedFoods]);
    setSelectedFoods([]);
  };

  const filteredFoodList = foodList.filter((food) => food.type === selectedAnimal);

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      {item.type === 'Hayvan Türü' ? (
        <View>
          <Text style={styles.sectionTitle}>Hayvan Türü Seçin</Text>
          <View style={styles.optionGroup}>
            {['Köpek', 'Kedi', 'Kuş'].map((animal) => (
              <TouchableOpacity key={animal} onPress={() => setSelectedAnimal(animal)} style={[styles.option, selectedAnimal === animal && styles.selectedOption]}>
                <Text style={styles.optionText}>{animal}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : item.type === 'Yaş' ? (
        <View>
          <Text style={styles.sectionTitle}>Yaş Seçin</Text>
          <View style={styles.optionGroup}>
            {['Yavru', 'Yetişkin', 'Yaşlı'].map((ageOption) => (
              <TouchableOpacity key={ageOption} onPress={() => setAge(ageOption)} style={[styles.option, age === ageOption && styles.selectedOption]}>
                <Text style={styles.optionText}>{ageOption}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : item.type === 'Diyet' ? (
        <View>
          <Text style={styles.sectionTitle}>Diyet Türü Seçin</Text>
          <View style={styles.optionGroup}>
            {['Normal', 'Kilo Kontrolü'].map((diet) => (
              <TouchableOpacity key={diet} onPress={() => setDietType(diet)} style={[styles.option, dietType === diet && styles.selectedOption]}>
                <Text style={styles.optionText}>{diet}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : item.type === 'Ağırlık' ? (
        <View>
          <Text style={styles.sectionTitle}>Ağırlık Girin</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholder="Ağırlığı giriniz" />
          <Button title="Mama Miktarını Hesapla" onPress={calculateFoodAmount} />
          {recommendedFood && <Text style={styles.result}>Önerilen Miktar: {recommendedFood}</Text>}
        </View>
      ) : item.type === 'Mama Listesi' ? (
        <View>
          <Text style={styles.sectionTitle}>Mama Seçin</Text>
          <FlatList
            data={filteredFoodList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity key={item.id} style={[styles.foodButton, selectedFoods.includes(item.name) && styles.selectedFood]} onPress={() => toggleFoodSelection(item.name)}>
                <Text style={styles.listItem}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
          <View style={styles.buttonContainer}>
            <Button title="Sepete Ekle" onPress={addToShoppingList} />
          </View>
          {shoppingList.length > 0 && (
            <View style={styles.shoppingList}>
              <Text style={styles.label}>Sepetiniz:</Text>
              {shoppingList.map((item, index) => (
                <Text key={index} style={styles.listItem}>- {item}</Text>
              ))}
            </View>
          )}
        </View>
      ) : item.type === 'Eğitim' ? (
        <Text style={styles.educationText}>Evcil hayvanınızın sağlıklı beslenmesi hakkında daha fazla bilgi için eğitim içeriklerine göz atın!</Text>
      ) : null}
    </View>
  );

  const data = [
    { id: '1', type: 'Hayvan Türü' },
    { id: '2', type: 'Yaş' },
    { id: '3', type: 'Ağırlık' },
    { id: '4', type: 'Diyet' },
    { id: '5', type: 'Mama Listesi' },
    { id: '6', type: 'Eğitim' },
  ];

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    />
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 16 },
  label: { fontSize: 18, fontWeight: '500', marginVertical: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 8, marginBottom: 16, minHeight: 40 },
  optionGroup: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8, flexWrap: 'wrap' },
  option: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, margin: 4 },
  selectedOption: { backgroundColor: '#add8e6', borderColor: '#000' },
  optionText: { fontSize: 16 },
  result: { fontSize: 16, fontWeight: 'bold', marginVertical: 8 },
  foodButton: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginVertical: 4 },
  selectedFood: { backgroundColor: '#add8e6' },
  listItem: { fontSize: 16 },
  shoppingList: { marginTop: 16, marginBottom: 16 },
  educationText: { fontSize: 16, marginTop: 16, color: '#555' },
  buttonContainer: { marginVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginVertical: 12, color: '#333' }
});

export default BeslenmeSayfasi;
