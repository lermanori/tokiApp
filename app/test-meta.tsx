import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MetaTags from '@/components/MetaTags';
import { testTokiData, testMetaTags, validateMetaTags } from '@/utils/testMetaTags';
import { generateTokiMetaTags } from '@/utils/metaTags';

export default function TestMetaPage() {
  const runTests = () => {
    testMetaTags();
  };

  const testSpecificScenario = (scenario: string) => {
    const tokiData = testTokiData[scenario];
    if (tokiData) {
      const metaTags = generateTokiMetaTags(tokiData);
      console.log(`\n🧪 Testing ${scenario} scenario:`);
      console.log('─'.repeat(40));
      validateMetaTags(metaTags);
      console.log('Meta Tags:', metaTags);
    }
  };

  return (
    <>
      <MetaTags 
        title="Meta Tags Test Page"
        description="Test page for verifying rich link previews and Open Graph meta tags"
        url="https://toki.app/test-meta"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          <Text style={styles.title}>🧪 Meta Tags Test Page</Text>
          <Text style={styles.subtitle}>Test rich link previews and Open Graph meta tags</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Scenarios</Text>
            
            <TouchableOpacity style={styles.button} onPress={runTests}>
              <Text style={styles.buttonText}>Run All Tests</Text>
            </TouchableOpacity>
            
            {Object.keys(testTokiData).map((scenario) => (
              <TouchableOpacity 
                key={scenario}
                style={styles.scenarioButton} 
                onPress={() => testSpecificScenario(scenario)}
              >
                <Text style={styles.scenarioButtonText}>
                  Test {scenario.charAt(0).toUpperCase() + scenario.slice(1)} Scenario
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instruction}>
              1. Open browser developer tools{'\n'}
              2. Check the &lt;head&gt; section for meta tags{'\n'}
              3. Test sharing on social media platforms{'\n'}
              4. Use Facebook Debugger: https://developers.facebook.com/tools/debug/{'\n'}
              5. Use Twitter Card Validator: https://cards-dev.twitter.com/validator{'\n'}
              6. Use LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expected Results</Text>
            <Text style={styles.instruction}>
              • Rich link previews with Toki images{'\n'}
              • Proper titles and descriptions{'\n'}
              • Open Graph and Twitter Card meta tags{'\n'}
              • Fallback images for Tokis without images{'\n'}
              • Proper URL generation with parameters
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#B49AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  scenarioButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
  },
  scenarioButtonText: {
    color: '#374151',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  instruction: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
});
