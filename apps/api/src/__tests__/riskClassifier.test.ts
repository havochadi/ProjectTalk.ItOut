import { describe, it, expect } from '@jest/globals';
import { classifyRiskLocally } from '../services/ai/openaiService';
import { RISK_TAGS } from '@talkitout/lib';

describe('Local risk classifier', () => {
  it('flags self-harm statements as high risk', () => {
    const result = classifyRiskLocally('I want to die and hurt myself');

    expect(result.severity).toBe(3);
    expect(result.sentiment).toBe('neg');
    expect(result.riskTags).toContain(RISK_TAGS.SELF_HARM);
  });

  it('flags severe stress statements as medium risk', () => {
    const result = classifyRiskLocally("I can't handle this anymore, I feel overwhelmed");

    expect(result.severity).toBe(2);
    expect(result.riskTags).toContain(RISK_TAGS.SEVERE_STRESS);
  });

  it('keeps neutral statements low risk', () => {
    const result = classifyRiskLocally('I finished my homework and feel okay');

    expect(result.severity).toBe(1);
    expect(result.riskTags).toHaveLength(0);
  });
});
