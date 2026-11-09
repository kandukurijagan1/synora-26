export type ApiStatus = 'success' | 'error' | 'not_found' | 'duplicate' | 'unauthorized';

export interface ApiResponse<T = any> {
  status: ApiStatus;
  code?: string;
  message: string;
  data?: T;
}

export interface ApiRequests {
  register: {
    requestId: string;
    teamName: string;
    track: string;
    college: string;
    collegeType: 'internal' | 'external';
    participantCategory?: 'student' | 'faculty';
    leaderName: string;
    leaderEmail: string;
    leaderPhone: string;
    leaderYear: string;
    member1Name: string;
    member1Email?: string;
    member1Phone?: string;
    member1Year?: string;
    member2Name?: string;
    member2Email?: string;
    member2Phone?: string;
    member2Year?: string;
    member3Name?: string;
    member3Email?: string;
    member3Phone?: string;
    member3Year?: string;
    internalRegNo?: string;
    txnId?: string;
    totalFee: number;
    paymentScreenshotBase64?: string;
    paymentScreenshotName?: string;
    collegeIdCardBase64?: string;
    collegeIdCardName?: string;
  };
  listteams: {
    adminKey: string;
  };
  checkin: {
    adminKey: string;
    teamId: string;
  };
  uncheck: {
    adminKey: string;
    teamId: string;
  };
  stats: {
    adminKey: string;
  };
  getemailsettings: {
    adminKey: string;
  };
  setemailsettings: {
    adminKey: string;
    enabled: boolean;
  };
  sendteamemail: {
    adminKey: string;
    target: string;
  };
  adminotp: {
    email: string;
    otp: string;
    name: string;
  };
  repair: {
    adminKey: string;
  };
}

export type ApiAction = keyof ApiRequests;

export interface Contract {
  call<K extends ApiAction>(action: K, payload: ApiRequests[K]): Promise<ApiResponse>;
}
