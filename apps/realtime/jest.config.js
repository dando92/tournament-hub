module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: 'tests/unit/.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  moduleNameMapper: { '^@realtime/(.*)$': '<rootDir>/src/$1' },
};
