export interface DetectCandidate {
  name: string;
  confidence: number;
}

export interface DetectorRef {
  id: string;
  version: string;
}

export interface DetectResponse {
  candidates: DetectCandidate[];
  detector: DetectorRef;
}
