'use strict';

tagsInput.directive('groupFilter', function($timeout, $document, $sce, $q, $window, tagsInputConfig, tiUtil) {
    function GroupSuggestionList(loadFn, options, events) {
        var self = {}, getDifference, lastPromise, getTagId;

        getTagId = function() {
            return options.tagsInput.keyProperty || options.tagsInput.displayProperty;
        };

        getDifference = function(array1, array2) {
            return array1.filter(function(item) {
                return !tiUtil.findInObjectArray(array2, item, getTagId(), function(a, b) {
                    if (options.tagsInput.replaceSpacesWithDashes) {
                        a = tiUtil.replaceSpacesWithDashes(a);
                        b = tiUtil.replaceSpacesWithDashes(b);
                    }
                    return tiUtil.defaultComparer(a, b);
                });
            });
        };

        self.reset = function() {
            lastPromise = null;

            self.items = [];
            self.visible = false;
            self.index = -1;
            self.selected = null;
            self.query = null;
        };

        self.show = function() {
            self.visible = true;
        };

        self.load = tiUtil.debounce(function(query, tags) {
            var promise = $q.when(loadFn({ $query: query }));
            lastPromise = promise;

            promise.then(function(items) {
                if (promise !== lastPromise) {
                    return;
                }
                items = tiUtil.makeObjectArray(items.data || items, getTagId());
                items = getDifference(items, tags);
                self.items = items;

                if (self.items.length > 0) {
                    self.show();
                }
                else {
                    self.reset();
                }
            });
        });

        self.select = function(index) {
            if (index < 0) {
                index = self.items.length - 1;
            }
            else if (index >= self.items.length) {
                index = 0;
            }
            self.index = index;
            self.selected = self.items[index];
            events.trigger('suggestion-selected', index);
        };

        self.reset();

        return self;
    }
    return {
        restrict: 'E',
        require: '^tagsInput',
        scope: { source: '&' },
        templateUrl: 'ngTagsInput/grouped-tags.html',
        controller: function($scope, $element, $attrs) {
            $scope.events = tiUtil.simplePubSub();

           tagsInputConfig.load('groupFilter', $scope, $attrs, {
                template: [String, 'ngTagsInput/auto-complete-match.html'],
                debounceDelay: [Number, 100],
                minLength: [Number, 3],
                highlightMatchedText: [Boolean, true],
                maxResultsToShow: [Number, 10],
                loadOnDownArrow: [Boolean, false],
                loadOnEmpty: [Boolean, false],
                loadOnFocus: [Boolean, false],
                selectFirstMatch: [Boolean, true],
                displayProperty: [String, '']
            });

            $scope.suggestionList = new GroupSuggestionList($scope.source, $scope.options, $scope.events);
        },
        link: function(scope, element, attrs, tagsInputCtrl) {
            var hotkeys = [KEYS.enter, KEYS.tab, KEYS.escape, KEYS.up, KEYS.down],
                suggestionList = scope.suggestionList,
                tagsInput = tagsInputCtrl.registerGroupTags(),
                options = scope.options,
                events = scope.events;

            options.tagsInput = tagsInput.getOptions();

            scope.eventHandlers = {
                groupTagShow: {
                    click: function() {
                        suggestionList.load(undefined, []);
                    }
                }
            };
            scope.addSuggestionByIndex = function(index) {
                suggestionList.select(index);
                scope.addSuggestion();
            };

            scope.addSuggestion = function() {
                var added = false,
                    selectedGroupID = null;

                if (suggestionList.selected) {
                    if(suggestionList.selected.isGroup) {
                        //Load The Tags in this group
                        selectedGroupID = suggestionList.selected.id;
                        suggestionList.reset();
                        suggestionList.load(selectedGroupID, []);
                    } else {
                        //Select the tag adn reset
                        tagsInput.addTag(angular.copy(suggestionList.selected));
                        suggestionList.reset();
                        added = true;
                    }
                }
                return added;
            };

            scope.track = function(item) {
                return item[options.tagsInput.keyProperty || options.tagsInput.displayProperty];
            };

            tagsInput
                .on('tag-added tag-removed input-change input-blur', function(value) {
                    suggestionList.reset();
                });
        }
    };
});
